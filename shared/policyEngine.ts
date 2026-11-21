import { getToolDefinition } from './constants';
import type { ApprovalPolicy, Coworker, Role, ToolRiskLevel } from './types';

// ==============================================================================
// Security, Governance, RBAC, Tool Allowlists & Secret Redaction Engine
// ==============================================================================

const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|secret|token|password|passwd|authorization|cookie|credential|private[_-]?key|stripe|webhook)/i;

const SENSITIVE_VALUE_PATTERNS = [
  /sk_(live|test)_[A-Za-z0-9]{8,}/g,
  /whsec_[A-Za-z0-9_]{8,}/g,
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,
  /AIza[0-9A-Za-z_-]{20,}/g,
];

export function redactString(input: string): string {
  let out = input;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    out = out.replace(pattern, '[REDACTED_SECRET]');
  }
  return out;
}

export function redactSensitiveData<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactSensitiveData(item)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactSensitiveData(val);
      }
    }
    return out as T;
  }
  return value;
}

// --- RBAC Matrix ---
const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  OWNER: new Set([
    'desk:read',
    'desk:write',
    'orchestrator:run',
    'clients:write',
    'coworkers:write',
    'spaces:write',
    'approvals:decide',
    'integrations:write',
    'admin:read',
    'admin:write',
    'billing:manage',
    'data:export',
    'data:delete',
  ]),
  ADMIN: new Set([
    'desk:read',
    'desk:write',
    'orchestrator:run',
    'clients:write',
    'coworkers:write',
    'spaces:write',
    'approvals:decide',
    'integrations:write',
    'admin:read',
    'admin:write',
    'data:export',
  ]),
  STRATEGIST: new Set([
    'desk:read',
    'desk:write',
    'orchestrator:run',
    'clients:write',
    'coworkers:write',
    'spaces:write',
    'approvals:decide',
  ]),
  REVIEWER: new Set(['desk:read', 'approvals:decide', 'spaces:write']),
  VIEWER: new Set(['desk:read']),
};

export function hasRolePermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

// --- Tool Access & Approval Gate Policy ---
export interface ToolPolicyDecision {
  decision: 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK';
  riskLevel: ToolRiskLevel;
  reason: string;
}

export function evaluateToolExecutionPolicy(params: {
  toolId: string;
  coworker?: Pick<Coworker, 'allowedTools' | 'approvalPolicy' | 'name'>;
  orgBlockedTools?: string[];
  safeDefaultsEnabled?: boolean;
}): ToolPolicyDecision {
  const def = getToolDefinition(params.toolId);
  if (!def) {
    return {
      decision: 'BLOCK',
      riskLevel: 'sensitive',
      reason: `Unknown tool "${params.toolId}" is blocked by default allowlist policy.`,
    };
  }

  // 1. Organization-level blocklist
  if (params.orgBlockedTools?.includes(def.id)) {
    return {
      decision: 'BLOCK',
      riskLevel: def.risk,
      reason: `Tool "${def.name}" is explicitly blocked by organization policy.`,
    };
  }

  // 2. Coworker-level allowlist
  if (params.coworker && !params.coworker.allowedTools.includes(def.id)) {
    return {
      decision: 'BLOCK',
      riskLevel: def.risk,
      reason: `Tool "${def.name}" is not in ${params.coworker.name}'s configured allowlist.`,
    };
  }

  // 3. Always gate sensitive/destructive external actions (publishing, messaging, deletion, terminal)
  if (def.risk === 'destructive' || def.risk === 'sensitive') {
    return {
      decision: 'REQUIRE_APPROVAL',
      riskLevel: def.risk,
      reason: `Consequential ${def.risk} action ("${def.name}") always requires explicit human approval.`,
    };
  }

  // 4. Evaluate coworker / workspace approval policy
  const effectivePolicy: ApprovalPolicy = params.coworker?.approvalPolicy ?? 'REQUIRE_APPROVAL_WRITES';

  if (effectivePolicy === 'BLOCKED') {
    return {
      decision: 'BLOCK',
      riskLevel: def.risk,
      reason: 'Coworker policy is currently set to BLOCKED.',
    };
  }

  if (effectivePolicy === 'REQUIRE_APPROVAL_ALL') {
    return {
      decision: 'REQUIRE_APPROVAL',
      riskLevel: def.risk,
      reason: 'Coworker policy requires human approval for all tool calls.',
    };
  }

  if (def.risk === 'write' && (effectivePolicy === 'REQUIRE_APPROVAL_WRITES' || params.safeDefaultsEnabled !== false)) {
    return {
      decision: 'REQUIRE_APPROVAL',
      riskLevel: def.risk,
      reason: `Write action ("${def.name}") requires human review before saving.`,
    };
  }

  return {
    decision: 'ALLOW',
    riskLevel: def.risk,
    reason: `Read-only tool "${def.name}" permitted under safe-default policy.`,
  };
}
