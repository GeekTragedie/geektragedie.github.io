package banking;

import java.util.Scanner;

/**
 * Represent a bank for managing customers and their bank accounts. 
 */
public class Bank {

	public static void main(String[] args) {

//creates new instance of Bank class
		Bank bank = new Bank(); 
		
		//calls the run method in the bank class
		bank.run();

	}
	
	/**  
	 * Runs the program by initializing and managing bank accounts and customers.
	 */
	public void run() {
		System.out.println("Welcome to the Bank! What is your name?");
		
		//create scanner to get user input
		Scanner scanner = new Scanner(System.in); 
		
		//get the next token (word), which is the customer's name
		String name = scanner.next();
		
		System.out.println( "Hello " + name + "! We are creating checking and savings accounts for you."); 
		
		//create customer with given name
		Customer customer = new Customer(name);
		
		//get address
		System.out.println( "What is your address?"); 
		
		//get the next token, which is the customer's address
		String address = scanner.next(); 
		
		//set the customer's address
		customer.setAddress(address);
		
		//create a checking account for customer
		BankAccount checkingAccount = new BankAccount("checking", customer);
		
		//create a savings account for customer
		BankAccount savingsAccount = new BankAccount("savings", customer);
		
		//gets and prints the customer info associated with the checking account
		System.out.println();
		System.out.println("Customer info: ");
		System.out.println(checkingAccount.getCustomerInfo()); 
		
		//get and print account info for checking account
		System.out.println("Checking account: ");
		System.out.println(checkingAccount.getAccountInfo());
		
		//get and print account info for savings account
		System.out.println("Savings account: ");
		System.out.println(savingsAccount.getAccountInfo());
		
		//deposits 
		
		//deposit into checking
		System.out.println();
		System.out.println("Amount (decimal) to deposit into your checking account"); 
		//get next token (double)
		double amount = scanner.nextDouble(); 
		//deposit into checking account
		checkingAccount.deposit(amount); 
		
		//deposit into checking
		System.out.println();
		System.out.println("Amount (decimal) to deposit into your savings account"); 
		//get next token (double)
		amount = scanner.nextDouble(); 
		//deposit into savings account
		savingsAccount.deposit(amount); 
		
		//print new balances
		System.out.println(checkingAccount.getAccountInfo());
		System.out.println(savingsAccount.getAccountInfo());
		
		//withdrawals 
		
		//from checking
		System.out.println();
		System.out.println("Amount (decimal) to withdraw into your checking account"); 
		//get next token (double)
		amount = scanner.nextDouble();
		
		try {
			checkingAccount.withdraw(amount);
		} catch (Exception e) {
			// prints custom error message from withdraw method 
			System.out.println(e.getMessage());
		} 
		
		//from savings 
		System.out.println();
		System.out.println("Amount (decimal) to withdraw into your savings account"); 
		//get next token (double)
		amount = scanner.nextDouble();
		
		try {
			savingsAccount.withdraw(amount);
		} catch (Exception e) {
			// prints custom error message from withdraw method 
			System.out.println(e.getMessage());
		}
		
		//print new balances
		System.out.println(checkingAccount.getAccountInfo());
		System.out.println(savingsAccount.getAccountInfo());
		
		scanner.close();
		
	}
}
