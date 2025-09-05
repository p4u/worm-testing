import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import { AccountBalanceWallet, Warning } from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';

const Header: React.FC = () => {
  const { account, isConnected, isConnecting, error, connectWallet, disconnectWallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <AppBar position="static" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #333' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            🪱 WORM
          </Typography>
          <Typography variant="subtitle1" sx={{ ml: 1, color: 'text.secondary' }}>
            Shai-Hulud Testnet
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Network Status */}
          <Chip
            label="Sepolia"
            color="primary"
            size="small"
            sx={{ fontFamily: 'monospace' }}
          />

          {/* Wallet Connection */}
          {error && (
            <Chip
              icon={<Warning />}
              label="Error"
              color="error"
              size="small"
              title={error}
            />
          )}

          {isConnected && account ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<AccountBalanceWallet />}
                label={formatAddress(account)}
                color="success"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={disconnectWallet}
                sx={{ minWidth: 'auto' }}
              >
                Disconnect
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              startIcon={isConnecting ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
              onClick={connectWallet}
              disabled={isConnecting}
              sx={{ minWidth: 140 }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
