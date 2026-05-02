import React from 'react';
import { Container, Divider } from '@mui/material';
import { LifetimeSection } from './LifetimeSection';
import { FilterSection } from './FilterSection';

export const MachineDashboard: React.FC = () => (
  <Container maxWidth="xl" sx={{ py: 3 }}>
    <LifetimeSection />
    <Divider sx={{ my: 4 }} />
    <FilterSection />
  </Container>
);
