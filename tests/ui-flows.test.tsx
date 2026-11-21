import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../src/pages/LandingPage';
import { SeoOsDesk2D } from '../src/components/SeoOsDesk2D';
import { buildSeededDemoBundle } from '../shared/seedData';

describe('Core UI Flows, Exact Commercial Pricing & Accessible Non-3D Desk', () => {
  it('renders unmistakable $997 setup, first 2 months included, $2,400/month pricing and all 3 CTAs on landing page', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/\$997/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/First 2 Months Included/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$2,400\/month/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Try the Personal Agent/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Start Business Setup/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Book a Business Walkthrough/i).length).toBeGreaterThan(0);
  });

  it('renders the accessible non-3D SEO OS desk with orchestrator, 9 specialist desks, coworkers, and client brain', () => {
    const demo = buildSeededDemoBundle('org_test01', 'usr_test01', 'Alex');
    render(
      <SeoOsDesk2D
        tasks={demo.tasks}
        coworkers={demo.coworkers}
        brainNodes={demo.brainNodes}
        onSelectOrchestrator={() => {}}
        onSelectSpecialist={() => {}}
        onSelectCoworker={() => {}}
        onSelectBrainNode={() => {}}
      />
    );

    expect(screen.getByText(/Central Orchestrator Dais/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Audit Desk/i)).toBeInTheDocument();
    expect(screen.getByText(/Aria Vance/i)).toBeInTheDocument();
    expect(screen.getByText(/Client Knowledge Brain Chandelier/i)).toBeInTheDocument();
    expect(screen.getByText(/SKIPPED \(Soft\)/i)).toBeInTheDocument();
    expect(screen.getByText(/BLOCKED \(Gate\)/i)).toBeInTheDocument();
  });
});
