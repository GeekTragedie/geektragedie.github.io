package banking;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BankAccountTest2 {

	//declare objects for testing
	Customer customer;
	BankAccount myCheckingAccount;
	BankAccount mySavingsAccount;
	
	@BeforeEach
	void setUp() throws Exception {
		
		//initialize objects here for testing
		this.customer = new Customer("Brandon");
		this.myCheckingAccount = new BankAccount("checking", this.customer);
		this.mySavingsAccount = new BankAccount("savings", this.customer);
	}

	@Test
	void testDeposit() {
		
		//make deposit
		this.myCheckingAccount.deposit(100);
		
		//test that current balance in 100
		assertEquals(100, this.myCheckingAccount.balance);
		
		//make deposit of negative amount
		this.myCheckingAccount.deposit(-100);
		
		//balance should be the same - cannot deposit a negative amount
		assertEquals(100, this.myCheckingAccount.balance);
		
		//deposit 0
		
		this.myCheckingAccount.deposit(0);
		assertEquals(100, this.myCheckingAccount.balance);
	}

	@Test
	void testWithdraw() {
		//deposit initial 100 into savings 
		this.mySavingsAccount.deposit(100);
		
		assertEquals(100, this.mySavingsAccount.balance);
		
		//try to make withdrawal of 80
		try {
			this.mySavingsAccount.withdraw(80);
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//balance should be 20
		assertEquals(20, this.mySavingsAccount.balance);
		
		//try to withdraw amount greater than balance
		//expect exception 
		assertThrows(Exception.class, () -> {
			this.mySavingsAccount.withdraw(21);
		});
		
		assertEquals(20, this.mySavingsAccount.balance);
		
		//try to make withdrawal
		//does not throw exception 
		assertDoesNotThrow(() -> {
			this.mySavingsAccount.withdraw(19);
		});
		
		//balance should be 1
		assertEquals(1, this.mySavingsAccount.balance);
	}

	@Test
	void testFastWithdraw() {
		//initial deposit
		this.myCheckingAccount.deposit(100);
		
		//try to make fast withdrawal
		//default amount is 60
		try {
			this.myCheckingAccount.fastWithdraw();
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		//balance should be 40
		assertEquals(40, this.myCheckingAccount.balance); 
		
		//reset the fast cash amount
		this.myCheckingAccount.setFastCashamount(20);
		
		//assert that an exception is not thrown when I make fast cash withdrawal
		assertDoesNotThrow(() ->{
			this.myCheckingAccount.fastWithdraw();
		});
		
		//check balance
		assertEquals(20,  this.myCheckingAccount.balance);
		
		//set fast cash amount to negative 
		//should be ignored 
		this.myCheckingAccount.setFastCashamount(-50);
		
		//should still withdrawal 20
		try {
			this.myCheckingAccount.fastWithdraw();
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//balance should be 0 after fast withdrawal 
		assertEquals(0,  this.myCheckingAccount.balance);
		
		//expecting exception because of 0 balance withdrawal
		assertThrows(Exception.class, () -> {
			this.myCheckingAccount.fastWithdraw();
		});
	}
}
