// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoToken is ERC20, ERC20Burnable, Ownable {
    uint256 public maxSupply;
    
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _maxSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(_maxSupply >= initialSupply, "Max supply must be >= initial supply");
        maxSupply = _maxSupply * 10 ** decimals();
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }
}