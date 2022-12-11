const getProvider = async ({ getDefaultProvider }, networkName, isEthers) => {
  let provider;
  try {
    isEthers
      ? (provider = await new getDefaultProvider(networkName))
      : (provider = await getDefaultProvider(networkName));
  } catch (error) {
    console.log("Unable to connect.");
    console.log(error);
  }
  return provider;
};

const initAccount = async (rinkebyWallet, zkSyncProvider, { Wallet }) => {
  return await Wallet.fromEthSigner(rinkebyWallet, zkSyncProvider);
};

const registerAccount = async (wallet) => {
  console.log(`Registering the ${wallet.address()} account on zkSync`);
  if (!(await wallet.isSigningKeySet())) {
    if ((await wallet.getAccountId()) === undefined) {
      throw new Error("Unknown account");
    }
    const changePublicKey = await wallet.setSigningKey();
    await changePublicKey.awaitReceipt();
  }
};

const depositToZkSync = async (
  zkSyncWallet,
  token,
  amountToDeposit,
  ethers
) => {
  const deposit = await zkSyncWallet.depositToSyncFromEthereum({
    depositTo: zkSyncWallet.address(),
    token: token,
    amount: ethers.utils.parseEther(amountToDeposit),
  });
  try {
    await deposit.awaitReceipt();
  } catch (error) {
    console.log("Error while awaiting confirmation from the zkSync operators.");
    console.log(error);
  }
};

const transfer = async (
  from,
  toAddress,
  amountToTransfer,
  transferFee,
  token,
  zksync,
  ethers
) => {
  const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(
    ethers.utils.parseEther(amountToTransfer)
  );
  const closestPackableFee = zksync.utils.closestPackableTransactionFee(
    ethers.utils.parseEther(transferFee)
  );

  const transfer = await from.syncTransfer({
    to: toAddress,
    token: token,
    amount: closestPackableAmount,
    fee: closestPackableFee,
  });
  const transferReceipt = await transfer.awaitReceipt();
  console.log("Got transfer receipt.");
  console.log(transferReceipt);
};

const getFee = async (
  transactionType,
  address,
  token,
  zkSyncProvider,
  ethers
) => {
  const feeInWei = await zkSyncProvider.getTransactionFee(
    transactionType,
    address,
    token
  );
  return ethers.utils.formatEther(feeInWei.totalFee.toString());
};

const withdrawToEthereum = async (
  wallet,
  amountToWithdraw,
  withdrawalFee,
  token,
  zksync,
  ethers
) => {
  const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(
    ethers.utils.parseEther(amountToWithdraw)
  );
  const closestPackableFee = zksync.utils.closestPackableTransactionFee(
    ethers.utils.parseEther(withdrawalFee)
  );
  const withdraw = await wallet.withdrawFromSyncToEthereum({
    ethAddress: wallet.address(),
    token: token,
    amount: closestPackableAmount,
    fee: closestPackableFee,
  });
  await withdraw.awaitVerifyReceipt();
  console.log("ZKP verification is complete");
};

const displayZkSyncBalance = async (wallet, ethers) => {
  const state = await wallet.getAccountState()

  if (state.committed.balances.ETH) {
    console.log(`Commited ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.committed.balances.ETH)}`)
  } else {
    console.log(`Commited ETH balance for ${wallet.address()}: 0`)
  }

  if (state.verified.balances.ETH) {
    console.log(`Verified ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.verified.balances.ETH)}`)
  } else {
    console.log(`Verified ETH balance for ${wallet.address()}: 0`)
  }
}
