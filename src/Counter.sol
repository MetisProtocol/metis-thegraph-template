// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


interface Interface {

	function ART_METIS_ADDRESS() external view returns(address);

	function HERCULES_POOL_ADDRESS() external view returns(address);

	function stakeAndLp(uint256 amount) external;

	function unstake(uint256 lpAmount) external;


	event StakeLP(address indexed wallet, uint256 startingAmount, uint256 artMetisAmount, uint256 metisAmount, uint256 lpTokenAmount);
}
