import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import type { LatestPlcValue } from '../services/apiService';

interface MaintenancePopupProps {
  open: boolean;
  onClose: () => void;
  data: LatestPlcValue[];
}

export const MaintenancePopup: React.FC<MaintenancePopupProps> = ({ open, onClose, data }) => {
  // Check for maintenance popup parameter
  const maintenanceParam = data.find(p => p.address === 'maintenance_popup');
  const consumableParam = data.find(p => p.address === 'consumable_spare_life');

  const shouldShowMaintenance = maintenanceParam?.value === 'TRUE' || maintenanceParam?.value === 'true' || maintenanceParam?.value === '1';
  const shouldShowConsumable = consumableParam && parseFloat(consumableParam.value) < 20; // Show if spare life < 20%

  const displayPopup = open && (shouldShowMaintenance || shouldShowConsumable);

  if (!displayPopup) return null;

  return (
    <Dialog
      open={displayPopup}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          border: '2px solid #ff9800',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <WarningIcon sx={{ color: '#ff9800', fontSize: 32 }} />
        <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', flex: 1 }}>
          Maintenance Alert
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {shouldShowMaintenance && (
          <Box mb={shouldShowConsumable ? 3 : 0}>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Regular Maintenance Required
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Point No. 14: Machine requires regular maintenance attention. Please schedule maintenance service.
            </Typography>
          </Box>
        )}
        {shouldShowConsumable && (
          <Box>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1, fontWeight: 600 }}>
              Consumable Spare Life Low
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Consumables spare life based on blasting time: {consumableParam?.value}%
            </Typography>
            <Typography variant="body2" sx={{ color: '#ff9800', fontStyle: 'italic' }}>
              Please input updated spare life value in HMI when replacement is performed.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' } }}>
          Acknowledged
        </Button>
      </DialogActions>
    </Dialog>
  );
};
