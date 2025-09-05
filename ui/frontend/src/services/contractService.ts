import { ethers, BrowserProvider, Contract, formatEther, parseEther } from 'ethers';

// Define correct ABIs based on the actual contract interfaces
const WORM_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function epochUser(uint256 epoch, address user) view returns (uint256)",
  "function epochTotal(uint256 epoch) view returns (uint256)",
  "function calculateMintAmount(uint256 startingEpoch, uint256 numEpochs, address user) view returns (uint256)",
  "function participate(uint256 amountPerEpoch, uint256 numEpochs)",
  "function claim(uint256 startingEpoch, uint256 numEpochs) returns (uint256)",
  "function approximate(uint256 amountPerEpoch, uint256 numEpochs) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function bethContract() view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

const BETH_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function mintCoin(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256 blockNumber, uint256 nullifier, uint256 remainingCoin, uint256 fee, uint256 spend, address receiver)",
  "function spendCoin(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256 coin, uint256 amount, uint256 remainingCoin, uint256 fee, address receiver)"
];

// Contract addresses on Sepolia
export const CONTRACTS = {
  SEPOLIA: {
    WORM: '0x78eFE1D19d5F5e9AED2C1219401b00f74166A1d9',
    BETH: '0x1b218670EcaDA5B15e2cE1879074e5D903b55334',
    RPC: 'https://sepolia.drpc.org'
  }
};

export interface WormInfo {
  network: string;
  address: string;
  currentEpoch: number;
  bethBalance: string;
  wormBalance: string;
  claimableWorm: string;
  epochs: Array<{
    epoch: number;
    committed: string;
    total: string;
    expected: string;
  }>;
  coins: Array<{
    id: string;
    amount: string;
  }>;
}

export class ContractService {
  private provider: BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private wormContract: Contract | null = null;
  private bethContract: Contract | null = null;

  constructor() {
    // Don't call async function in constructor
  }

  private async initializeProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // Initialize contracts
        this.wormContract = new Contract(
          CONTRACTS.SEPOLIA.WORM,
          WORM_ABI,
          this.signer
        );
        
        this.bethContract = new Contract(
          CONTRACTS.SEPOLIA.BETH,
          BETH_ABI,
          this.signer
        );
      } catch (error) {
        console.error('Failed to initialize provider:', error);
        throw new Error('Failed to connect to wallet');
      }
    }
  }

  async ensureConnection(): Promise<void> {
    if (!this.provider || !this.signer) {
      await this.initializeProvider();
    }
    
    if (!this.provider || !this.signer) {
      throw new Error('MetaMask not connected');
    }
  }

  async getCurrentEpoch(): Promise<number> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    const epoch = await this.wormContract.currentEpoch();
    return Number(epoch);
  }

  async getWormBalance(address: string): Promise<string> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    const balance = await this.wormContract.balanceOf(address);
    return formatEther(balance);
  }

  async getBethBalance(address: string): Promise<string> {
    await this.ensureConnection();
    if (!this.bethContract) throw new Error('BETH contract not initialized');
    
    const balance = await this.bethContract.balanceOf(address);
    return formatEther(balance);
  }

  async getEpochUserCommitment(epoch: number, address: string): Promise<string> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    const commitment = await this.wormContract.epochUser(epoch, address);
    return formatEther(commitment);
  }

  async getEpochTotal(epoch: number): Promise<string> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    const total = await this.wormContract.epochTotal(epoch);
    return formatEther(total);
  }

  async calculateMintAmount(startingEpoch: number, numEpochs: number, address: string): Promise<string> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    const amount = await this.wormContract.calculateMintAmount(startingEpoch, numEpochs, address);
    return formatEther(amount);
  }

  async getAccountInfo(address: string): Promise<WormInfo> {
    await this.ensureConnection();
    
    const [currentEpoch, wormBalance, bethBalance] = await Promise.all([
      this.getCurrentEpoch(),
      this.getWormBalance(address),
      this.getBethBalance(address)
    ]);

    // Get user's participation in recent epochs
    const epochs = [];
    const startEpoch = Math.max(0, currentEpoch - 5);
    
    // Process completed epochs (exclude current ongoing epoch)
    for (let epoch = startEpoch; epoch < currentEpoch; epoch++) {
      try {
        const [committed, total] = await Promise.all([
          this.getEpochUserCommitment(epoch, address),
          this.getEpochTotal(epoch)
        ]);
        
        if (parseFloat(committed) > 0) {
          // Only calculate expected rewards for completed epochs
          const expected = await this.calculateMintAmount(epoch, 1, address);
          epochs.push({
            epoch,
            committed,
            total,
            expected
          });
        }
      } catch (error) {
        console.warn(`Error fetching epoch ${epoch}:`, error);
      }
    }

    // Handle current epoch separately (ongoing epoch)
    try {
      const [currentCommitted, currentTotal] = await Promise.all([
        this.getEpochUserCommitment(currentEpoch, address),
        this.getEpochTotal(currentEpoch)
      ]);
      
      if (parseFloat(currentCommitted) > 0) {
        // For ongoing epoch, don't calculate expected rewards (would cause error)
        // Just show participation status
        epochs.push({
          epoch: currentEpoch,
          committed: currentCommitted,
          total: currentTotal,
          expected: '0' // Cannot calculate for ongoing epoch
        });
      }
    } catch (error) {
      console.warn(`Error fetching current epoch ${currentEpoch}:`, error);
    }

    // Calculate claimable WORM only from completed epochs
    let claimableWorm = '0';
    if (epochs.length > 0) {
      try {
        // Only calculate claimable amount from completed epochs
        const completedEpochs = epochs.filter(e => e.epoch < currentEpoch);
        if (completedEpochs.length > 0) {
          const firstCompletedEpoch = Math.min(...completedEpochs.map(e => e.epoch));
          claimableWorm = await this.calculateMintAmount(firstCompletedEpoch, completedEpochs.length, address);
        }
      } catch (error) {
        console.warn('Error calculating claimable WORM:', error);
        claimableWorm = '0';
      }
    }

    return {
      network: 'sepolia',
      address,
      currentEpoch,
      bethBalance,
      wormBalance,
      claimableWorm,
      epochs,
      coins: [] // BETH doesn't use the coin model like the CLI
    };
  }

  async participate(amountPerEpoch: string, numEpochs: number): Promise<ethers.ContractTransactionResponse> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    if (!this.signer) throw new Error('Signer not available');
    
    const amountWei = parseEther(amountPerEpoch);
    const totalAmount = amountWei * BigInt(numEpochs);
    
    // Check current allowance
    const userAddress = await this.signer.getAddress();
    const currentAllowance = await this.getBethAllowance(userAddress);
    const currentAllowanceWei = parseEther(currentAllowance);
    
    // If allowance is insufficient, throw error with helpful message
    if (currentAllowanceWei < totalAmount) {
      const neededAmount = formatEther(totalAmount);
      throw new Error(`Insufficient BETH allowance. Need ${neededAmount} BETH approved. Current allowance: ${currentAllowance} BETH. Please approve BETH tokens first.`);
    }
    
    return await this.wormContract.participate(amountWei, numEpochs);
  }

  async participateWithApproval(amountPerEpoch: string, numEpochs: number): Promise<{
    approvalTx?: ethers.ContractTransactionResponse;
    participateTx: ethers.ContractTransactionResponse;
  }> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    if (!this.signer) throw new Error('Signer not available');
    
    const amountWei = parseEther(amountPerEpoch);
    const totalAmount = amountWei * BigInt(numEpochs);
    
    // Check current allowance
    const userAddress = await this.signer.getAddress();
    const currentAllowance = await this.getBethAllowance(userAddress);
    const currentAllowanceWei = parseEther(currentAllowance);
    
    let approvalTx: ethers.ContractTransactionResponse | undefined;
    
    // If allowance is insufficient, approve first
    if (currentAllowanceWei < totalAmount) {
      const approvalAmount = formatEther(totalAmount);
      approvalTx = await this.approveBeth(approvalAmount);
      await this.waitForTransaction(approvalTx);
    }
    
    // Now participate
    const participateTx = await this.wormContract.participate(amountWei, numEpochs);
    
    return { approvalTx, participateTx };
  }

  async claim(startingEpoch: number, numEpochs: number): Promise<ethers.ContractTransactionResponse> {
    await this.ensureConnection();
    if (!this.wormContract) throw new Error('WORM contract not initialized');
    
    return await this.wormContract.claim(startingEpoch, numEpochs);
  }

  async approveBeth(amount: string): Promise<ethers.ContractTransactionResponse> {
    await this.ensureConnection();
    if (!this.bethContract) throw new Error('BETH contract not initialized');
    
    const amountWei = parseEther(amount);
    return await this.bethContract.approve(CONTRACTS.SEPOLIA.WORM, amountWei);
  }

  async getBethAllowance(owner: string): Promise<string> {
    await this.ensureConnection();
    if (!this.bethContract) throw new Error('BETH contract not initialized');
    
    const allowance = await this.bethContract.allowance(owner, CONTRACTS.SEPOLIA.WORM);
    return formatEther(allowance);
  }

  // Utility method to wait for transaction confirmation
  async waitForTransaction(tx: ethers.ContractTransactionResponse): Promise<ethers.ContractTransactionReceipt | null> {
    return await tx.wait();
  }
}

export const contractService = new ContractService();
