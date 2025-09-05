import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  LocalFireDepartment,
  Construction,
  Redeem,
  Refresh,
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService, WormInfo } from '../services/contractService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { isConnected, account } = useWallet();
  const [tabValue, setTabValue] = useState(0);
  const queryClient = useQueryClient();

  // Form states
  const [burnForm, setBurnForm] = useState({ amount: '1', spend: '0.99', fee: '0.01' });
  const [participateForm, setParticipateForm] = useState({ amountPerEpoch: '0.1', numEpochs: '3' });
  const [claimForm, setClaimForm] = useState({ fromEpoch: '0', numEpochs: '1' });

  // Fetch account info using contract service
  const { data: accountInfo, isLoading, error, refetch } = useQuery<WormInfo>({
    queryKey: ['accountInfo', account],
    queryFn: async () => {
      if (!account) throw new Error('No account connected');
      return await contractService.getAccountInfo(account);
    },
    enabled: isConnected && !!account,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Note: Burn functionality requires the WORM CLI miner tool
  const burnMutation = useMutation({
    mutationFn: async (data: { amount: string; spend: string; fee: string }) => {
      throw new Error('Burn functionality requires the WORM CLI miner tool. Please use: worm-miner burn --network sepolia --private-key YOUR_KEY --amount ' + data.amount + ' --spend ' + data.spend + ' --fee ' + data.fee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
    },
  });

  const participateMutation = useMutation({
    mutationFn: async (data: { amountPerEpoch: string; numEpochs: string }) => {
      const result = await contractService.participateWithApproval(data.amountPerEpoch, parseInt(data.numEpochs));
      return await contractService.waitForTransaction(result.participateTx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (amount: string) => {
      const tx = await contractService.approveBeth(amount);
      return await contractService.waitForTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (data: { fromEpoch: string; numEpochs: string }) => {
      const tx = await contractService.claim(parseInt(data.fromEpoch), parseInt(data.numEpochs));
      return await contractService.waitForTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountInfo'] });
    },
  });

  const handleBurn = () => {
    burnMutation.mutate(burnForm);
  };

  const handleParticipate = () => {
    participateMutation.mutate(participateForm);
  };

  const handleClaim = () => {
    claimMutation.mutate(claimForm);
  };

  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" gutterBottom>
          Connect your wallet to access WORM operations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please connect your MetaMask wallet to the Sepolia testnet to continue.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Account Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Account Overview
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={() => refetch()}
              disabled={isLoading}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">Failed to load account information</Alert>
          ) : accountInfo ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {parseFloat(accountInfo.bethBalance).toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  BETH Balance
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h6" color="secondary">
                  {parseFloat(accountInfo.wormBalance).toFixed(4)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  WORM Balance
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {parseFloat(accountInfo.claimableWorm).toFixed(6)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Claimable WORM
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center' }}>
                <Typography variant="h6">
                  {accountInfo.currentEpoch}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Epoch
                </Typography>
              </Box>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      {/* Operations Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab icon={<LocalFireDepartment />} label="Burn ETH" />
            <Tab icon={<Construction />} label="Mine WORM" />
            <Tab icon={<Redeem />} label="Claim Rewards" />
          </Tabs>
        </Box>

        {/* Burn ETH Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Burn ETH to BETH
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Convert Sepolia ETH to BETH (Burned ETH) for mining participation.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Amount (ETH)"
                value={burnForm.amount}
                onChange={(e) => setBurnForm({ ...burnForm, amount: e.target.value })}
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Spend (BETH)"
                value={burnForm.spend}
                onChange={(e) => setBurnForm({ ...burnForm, spend: e.target.value })}
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Fee (ETH)"
                value={burnForm.fee}
                onChange={(e) => setBurnForm({ ...burnForm, fee: e.target.value })}
                type="number"
                inputProps={{ step: '0.001', min: '0' }}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<LocalFireDepartment />}
            onClick={handleBurn}
            disabled={burnMutation.isPending}
            sx={{ mb: 2 }}
          >
            {burnMutation.isPending ? 'Burning...' : 'Burn ETH'}
          </Button>

          {burnMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(burnMutation.error as any)?.response?.data?.error || 'Burn operation failed'}
            </Alert>
          )}

          {burnMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Burn operation completed successfully!
            </Alert>
          )}
        </TabPanel>

        {/* Mine WORM Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Participate in Mining
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Commit BETH to mining epochs to earn WORM tokens. Each epoch lasts 30 minutes.
          </Typography>

          {accountInfo && parseFloat(accountInfo.bethBalance) === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                No BETH Balance Detected
              </Typography>
              <Typography variant="body2">
                You need BETH tokens to participate in mining. BETH tokens are created by burning Sepolia ETH using the WORM CLI miner tool.
                <br /><br />
                <strong>To get BETH tokens:</strong>
                <br />
                1. Install the WORM CLI miner
                <br />
                2. Run: <code>worm-miner burn --network sepolia --private-key YOUR_KEY --amount 1 --spend 0.99 --fee 0.01</code>
                <br />
                3. This will burn 1 Sepolia ETH and give you 0.99 BETH for mining
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="BETH per Epoch"
                value={participateForm.amountPerEpoch}
                onChange={(e) => setParticipateForm({ ...participateForm, amountPerEpoch: e.target.value })}
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Number of Epochs"
                value={participateForm.numEpochs}
                onChange={(e) => setParticipateForm({ ...participateForm, numEpochs: e.target.value })}
                type="number"
                inputProps={{ step: '1', min: '1' }}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Construction />}
            onClick={handleParticipate}
            disabled={participateMutation.isPending}
            sx={{ mb: 2 }}
          >
            {participateMutation.isPending ? 'Participating...' : 'Start Mining'}
          </Button>

          {participateMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(participateMutation.error as any)?.response?.data?.error || 'Participation failed'}
            </Alert>
          )}

          {participateMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Mining participation registered successfully!
            </Alert>
          )}
        </TabPanel>

        {/* Claim Rewards Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Claim WORM Rewards
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Claim your earned WORM tokens from completed mining epochs.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="From Epoch"
                value={claimForm.fromEpoch}
                onChange={(e) => setClaimForm({ ...claimForm, fromEpoch: e.target.value })}
                type="number"
                inputProps={{ step: '1', min: '0' }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Number of Epochs"
                value={claimForm.numEpochs}
                onChange={(e) => setClaimForm({ ...claimForm, numEpochs: e.target.value })}
                type="number"
                inputProps={{ step: '1', min: '1' }}
              />
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Redeem />}
            onClick={handleClaim}
            disabled={claimMutation.isPending}
            sx={{ mb: 2 }}
          >
            {claimMutation.isPending ? 'Claiming...' : 'Claim Rewards'}
          </Button>

          {claimMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(claimMutation.error as any)?.response?.data?.error || 'Claim operation failed'}
            </Alert>
          )}

          {claimMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Rewards claimed successfully!
            </Alert>
          )}
        </TabPanel>
      </Card>

      {/* Mining Status */}
      {accountInfo && accountInfo.epochs.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mining Status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {accountInfo.epochs.slice(0, 5).map((epoch) => {
                const isOngoing = epoch.epoch === accountInfo.currentEpoch;
                const borderColor = isOngoing ? '#ff9800' : '#333';
                const bgColor = isOngoing ? 'rgba(255, 152, 0, 0.1)' : 'transparent';
                
                return (
                  <Box 
                    key={epoch.epoch} 
                    sx={{ 
                      flex: '1 1 300px', 
                      p: 2, 
                      border: `1px solid ${borderColor}`, 
                      borderRadius: 1,
                      backgroundColor: bgColor
                    }}
                  >
                    <Typography variant="subtitle2">
                      Epoch #{epoch.epoch} {isOngoing && '(Ongoing)'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Committed: {parseFloat(epoch.committed).toFixed(4)} BETH
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isOngoing ? (
                        'Expected: Pending (epoch ongoing)'
                      ) : (
                        `Expected: ${parseFloat(epoch.expected).toFixed(6)} WORM`
                      )}
                    </Typography>
                    {isOngoing && (
                      <Typography variant="caption" color="warning.main">
                        Rewards will be available after epoch completes
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
