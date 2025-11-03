import requests
import sys
import json
from datetime import datetime

class CryptoAPITester:
    def __init__(self, base_url="https://blockchain-maker-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_wallets = []
        self.created_transactions = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_tokens', 'total_wallets', 'total_transactions', 'recent_transactions']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field: {field}")
                    return False
            print(f"   Total Tokens: {response.get('total_tokens', 0)}")
            print(f"   Total Wallets: {response.get('total_wallets', 0)}")
            print(f"   Total Transactions: {response.get('total_transactions', 0)}")
        return success

    def test_create_wallet(self, user_name):
        """Test wallet creation"""
        success, response = self.run_test(
            f"Create Wallet for {user_name}",
            "POST",
            "wallets",
            200,
            data={"user_name": user_name}
        )
        if success and 'address' in response:
            self.created_wallets.append(response)
            print(f"   Created wallet: {response['address']}")
            print(f"   Initial balance: {response.get('balance', 0)}")
            return response
        return None

    def test_get_wallets(self):
        """Test getting all wallets"""
        success, response = self.run_test(
            "Get All Wallets",
            "GET",
            "wallets",
            200
        )
        if success:
            print(f"   Found {len(response)} wallets")
        return success, response

    def test_get_wallet_by_address(self, address):
        """Test getting specific wallet by address"""
        success, response = self.run_test(
            f"Get Wallet by Address",
            "GET",
            f"wallets/{address}",
            200
        )
        if success:
            print(f"   Wallet user: {response.get('user_name', 'Unknown')}")
            print(f"   Balance: {response.get('balance', 0)}")
        return success, response

    def test_create_transaction(self, from_address, to_address, amount):
        """Test creating a transaction"""
        success, response = self.run_test(
            f"Create Transaction ({amount} tokens)",
            "POST",
            "transactions",
            200,
            data={
                "from_address": from_address,
                "to_address": to_address,
                "amount": amount
            }
        )
        if success:
            self.created_transactions.append(response)
            print(f"   Transaction ID: {response.get('id', 'Unknown')}")
            print(f"   Status: {response.get('status', 'Unknown')}")
        return success, response

    def test_get_transactions(self):
        """Test getting all transactions"""
        success, response = self.run_test(
            "Get All Transactions",
            "GET",
            "transactions",
            200
        )
        if success:
            print(f"   Found {len(response)} transactions")
        return success, response

    def test_insufficient_balance(self, from_address, to_address):
        """Test transaction with insufficient balance"""
        success, response = self.run_test(
            "Transaction with Insufficient Balance",
            "POST",
            "transactions",
            400,  # Should fail with 400
            data={
                "from_address": from_address,
                "to_address": to_address,
                "amount": 10000  # More than initial balance
            }
        )
        return success

    def test_invalid_wallet_transaction(self):
        """Test transaction with invalid wallet address"""
        success, response = self.run_test(
            "Transaction with Invalid Wallet",
            "POST",
            "transactions",
            404,  # Should fail with 404
            data={
                "from_address": "0xinvalidaddress",
                "to_address": "0xanotherinvalidaddress",
                "amount": 100
            }
        )
        return success

def main():
    print("🚀 Starting Crypto API Tests...")
    print("=" * 50)
    
    tester = CryptoAPITester()
    
    # Test 1: Dashboard stats (initial state)
    print("\n📊 Testing Dashboard...")
    tester.test_dashboard_stats()
    
    # Test 2: Create wallets
    print("\n👛 Testing Wallet Creation...")
    wallet1 = tester.test_create_wallet("Alice")
    wallet2 = tester.test_create_wallet("Bob")
    wallet3 = tester.test_create_wallet("Charlie")
    
    if not wallet1 or not wallet2:
        print("❌ Wallet creation failed, stopping tests")
        return 1
    
    # Test 3: Get all wallets
    print("\n📋 Testing Wallet Listing...")
    success, wallets = tester.test_get_wallets()
    
    # Test 4: Get specific wallet
    print("\n🔍 Testing Individual Wallet Retrieval...")
    tester.test_get_wallet_by_address(wallet1['address'])
    
    # Test 5: Create valid transaction
    print("\n💸 Testing Valid Transaction...")
    tx_success, transaction = tester.test_create_transaction(
        wallet1['address'], 
        wallet2['address'], 
        250.50
    )
    
    # Test 6: Get all transactions
    print("\n📜 Testing Transaction History...")
    tester.test_get_transactions()
    
    # Test 7: Test insufficient balance
    print("\n⚠️  Testing Error Handling...")
    tester.test_insufficient_balance(wallet1['address'], wallet2['address'])
    
    # Test 8: Test invalid wallet addresses
    tester.test_invalid_wallet_transaction()
    
    # Test 9: Dashboard stats after transactions
    print("\n📊 Testing Dashboard After Transactions...")
    tester.test_dashboard_stats()
    
    # Test 10: Verify balance updates
    print("\n🔄 Testing Balance Updates...")
    tester.test_get_wallet_by_address(wallet1['address'])  # Should have less balance
    tester.test_get_wallet_by_address(wallet2['address'])  # Should have more balance
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())