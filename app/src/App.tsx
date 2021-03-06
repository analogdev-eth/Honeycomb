// modules
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { ethers, Contract } from 'ethers';
import './App.css';

// components
import Nav from 'components/Nav';

// pages
import Home from 'pages/Home';
import Stake from 'pages/Stake';
import { Dashboard, InfoTitle } from 'pages/Dashboard';

// utils
import {
  connectWallet,
  refreshConnectWallet,
  getChainId,
  requestAddERC20Token
} from 'utils/wallet';

// types
import { Tabs } from 'types/tabs'

// constants
import erc20 from 'constants/erc20.json';
import contract from 'constants/honeycomb.json';
import { SUPPORTED_NETWORKS } from 'constants/networks';


const AppWrapper = styled.div`
  text-align: center;
  font-family: 'Fredoka', sans-serif;
`;

const ClickableText = styled(InfoTitle)`
  margin-top: .8rem;
  cursor: pointer;
  font-size: .85rem;
  font-weight: 600;
  transition: color .3s ease-out;
  width: fit-content;
  &:hover {
    color: #C68728;
  }
`;


const App = () => {
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [liquidity, setLiquidity] = useState(0);
  const [stake, setStake] = useState(0);
  const [share, setShare] = useState(0);
  const [rewardRemaining, setRewardRemaining] = useState(0);
  const [balance, setBalance] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [epoch2, setEpoch2] = useState(0);
  const [epoch3, setEpoch3] = useState(0);
  const [epoch4, setEpoch4] = useState(0);
  const [epoch5, setEpoch5] = useState(0);
  const [display, setDisplay] = useState<Tabs>('stake');
  const [symbol, setSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const APP_CHAIN: SUPPORTED_NETWORKS = SUPPORTED_NETWORKS.RINKEBY;

  const calculateShare = (
    contribution: number, total: number
  ): number => {
    return (contribution === 0 || total === 0) ? 0 : (contribution / total) * 100;
  }

  const handleConnectWallet = async () => {
    const account = await connectWallet();
    const chain = await getChainId();
    setNetwork(() => chain);
    setAddress(() => account);
  }

  const handleStake = async (amount: string) => {
    if (!address) return;
    try {
      const amountInWei = ethers.utils.parseEther(amount);
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner(address);
      const Honeycomb: Contract = new ethers.Contract(contract['address'], contract['abi'], signer);
      const tx = await Honeycomb.stake(amountInWei);
      await tx.wait();
      setStake(() => Number(amount) + stake);
      setLiquidity(() => Number(amount) + liquidity);
    }
    catch (err) {
      setAllowance(() => 0);
      if (err instanceof Error)
        console.error(err.message);
    }
  }

  const handleApprove = async (amount: string) => {
    if (!address) return;
    try {
      const amountInWei = ethers.utils.parseEther(amount);
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner(address);
      const Erc20: Contract = new ethers.Contract(erc20['address'], erc20['abi'], signer);
      const tx = await Erc20.approve(contract['address'], amountInWei);
      await tx.wait();
      setAllowance(() => Number(amount));
    }
    catch (err) {
      setAllowance(() => 0);
      if (err instanceof Error)
        console.error(err.message);
    }
  }

  const handleHarvest = async () => {
    if (!address) return;
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner(address);
      const Honeycomb: Contract = new ethers.Contract(contract['address'], contract['abi'], signer);
      const tx = await Honeycomb.harvest();
      await tx.wait();
      setLiquidity(() => liquidity - Number(stake));
      setStake(() => 0);
    }
    catch (err) {
      setAllowance(() => 0);
      if (err instanceof Error)
        console.error(err.message);
    }
  }

  const addTokenHandler = async (
    e: React.MouseEvent<HTMLParagraphElement, MouseEvent>
  ): Promise<void> => {
    e.preventDefault();
    requestAddERC20Token(erc20['address'], symbol, tokenDecimals);
  }

  useEffect(() => {
    const getWalletInfo = async (): Promise<void> => {
      const address = await refreshConnectWallet();
      setAddress(() => address);
    };
    const getChainInfo = async (): Promise<void> => {
      const chain = await getChainId();
      setNetwork(() => chain);
    }
    const addWalletListener = (): void => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      ethereum.on('accountsChanged', (accounts: string[]) => {
        accounts.length > 0 ? setAddress(() => accounts[0]) : setAddress('');
      });
    }
    const addChainListener = (): void => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      ethereum.on('chainChanged', (chainId: string) => {
        setNetwork(chainId);
      });
    }

    getWalletInfo();
    getChainInfo();
    addWalletListener();
    addChainListener();
  }, []);

  useEffect(() => {
    const { ethereum } = window as any;

    const getHoneycombInfo = async (): Promise<void> => {
      if (!ethereum) return;
      const provider = new ethers.providers.Web3Provider(ethereum);
      const Erc20 = new ethers.Contract(erc20['address'], erc20['abi'], provider);
      const Honeycomb: Contract = new ethers.Contract(contract['address'], contract['abi'], provider);

      const rewardRemaining = await Honeycomb.rewardRemaining();
      const stakingPool = await Honeycomb.stakingPool();
      const amountStaked = await Honeycomb.amountStaked(address || '0x0000000000000000000000000000000000000000');
      const allowance = await Honeycomb.getAddressAllowance(address || '0x0000000000000000000000000000000000000000');
      const balance = await Honeycomb.getAddressBalance(address || '0x0000000000000000000000000000000000000000');
      const secondEpochStart = await Honeycomb.secondEpochStart();
      const thirdEpochStart = await Honeycomb.thirdEpochStart();
      const fourthEpochStart = await Honeycomb.fourthEpochStart();
      const fifthEpochStart = await Honeycomb.fifthEpochStart();
      const tokenSymbol = await Erc20.symbol();
      const decimals = await Erc20.decimals();

      setLiquidity(() => Number(ethers.utils.formatEther(stakingPool.toString())));
      setStake(() => Number(ethers.utils.formatEther(amountStaked.toString())));
      setRewardRemaining(() => Number(ethers.utils.formatEther(rewardRemaining.toString())));
      setAllowance(() => Number(ethers.utils.formatEther(allowance.toString())));
      setBalance(() => Number(ethers.utils.formatEther(balance.toString())));
      setEpoch2(() => Number(secondEpochStart.toString()) * 1000);
      setEpoch3(() => Number(thirdEpochStart.toString()) * 1000);
      setEpoch4(() => Number(fourthEpochStart.toString()) * 1000);
      setEpoch5(() => Number(fifthEpochStart.toString()) * 1000);
      setSymbol(() => tokenSymbol);
      setTokenDecimals(() => Number(decimals.toString()));
    }

    getHoneycombInfo();
  }, [address, stake, liquidity, network]);

  useEffect(() => {
    setShare(() => calculateShare(stake, liquidity));
  }, [stake, liquidity]);


  return (
    <AppWrapper>
      <Nav
        address={address}
        display={display}
        network={network}
        APP_CHAIN={APP_CHAIN}
        connect={handleConnectWallet}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/stake" 
          element={
            <Stake
              epoch2={epoch2}
              symbol={symbol}
              address={address}
              balance={balance}
              stake={handleStake}
              allowance={allowance}
              approve={handleApprove}
              setDisplay={setDisplay}
              token={erc20['address']}
              connect={handleConnectWallet}
            />
          }
        />
        <Route 
          path="/dashboard" 
          element={
            <Dashboard
              stake={stake}
              share={share}
              epochs={[epoch3, epoch4, epoch5]}
              symbol={symbol}
              address={address}
              liquidity={liquidity}
              harvest={handleHarvest}
              setDisplay={setDisplay}
              connect={handleConnectWallet}
              rewardRemaining={rewardRemaining}
            />
          }
        />
      </Routes>
      {symbol &&
        <ClickableText
          className="add-to-wallet"
          onClick={(e) => addTokenHandler(e)}>
          Add {symbol} to Metamask
        </ClickableText>
      }
    </AppWrapper>
  );
}

export default App;
