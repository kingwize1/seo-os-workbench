import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../src/pages/LandingPage';
import { PersonalOverviewPage } from '../src/pages/PersonalOverviewPage';
import { SeoOsDesk2D } from '../src/components/SeoOsDesk2D';
import { AppProvider } from '../src/context/AppContext';
import { buildSeededDemoBundle } from '../shared/seedData';

describe('Core UI Flows, Exact Commercial Pricing, Waitlist Tracker & Accessible Non-3D Desk', () => {
  it('renders unmistakable $997 setup, first 2 months included, $2,400/month pricing and waitlist CTA on landing page', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/\$997/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/First 2 Months Included/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$2,400\/month/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Join the Waitlist/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Start Business Setup/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Book a Business Walkthrough/i).length).toBeGreaterThan(0);
  });

  it('renders the Personal Agent waitlist form, live running tracker, and kingwizemusic@gmail.com approval routing', () => {
    render(
      <AppProvider>
        <MemoryRouter>
          <PersonalOverviewPage />
        </MemoryRouter>
      </AppProvider>
    );

    expect(screen.getByText(/Live Running Waitlist Tracker/i)).toBeInTheDocument();
    expect(screen.getAllByText(/kingwizemusic@gmail\.com/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Join the Waitlist & Request Free Access/i)).toBeInTheDocument();
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
