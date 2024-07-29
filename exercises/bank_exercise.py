balance = 0
is_running = True

def show_balance(balance):
    print(f"Your balance is ${balance:.2f}")

def deposit(balance):
    amount = input("Enter the deposit amount: $")
    if amount.isdigit() and float(amount) > 0:
        balance += float(amount)
    else:
        print("Entry is not valid.")
    return balance


def withdraw(balance):
    if(balance >= 1):
        amount = input(f"Current balance: ${balance:.2f}, how much would you like to withdraw?: $")
        if amount.isdigit():
            if float(amount) <= balance and float(amount) > 0:
                balance -= int(amount)
                print(f"Withdraw of ${float(amount):.2f} was successful. Your remaining balance is ${balance:.2f}")
            else:
                print("Insufficient funds. Please try again.")
        else:
            print("Entry is not valid.")
    else:
        print("No funds available! Please make a deposit.")
    return balance

def main():
    balance = 0
    is_running = True
    name = input("Please enter your name: ")
    while is_running:
        print("**********************")
        print(f"OKE BANK  || user: {name}")
        print("**********************")
        print(" [1] Show Balance")
        print(" [2] Deposit")
        print(" [3] Withdraw")
        print(" [4] Exit")
        print("**********************")

        choice = input("Enter one of the options above: ")

        if choice == '1':
            print("----------------------")
            print(f"www.okebank.com/{name}/balance")
            print()
            show_balance(balance)
            print()
            print("----------------------")
            
        elif choice == '2':
            print("----------------------")
            print(f"www.okebank.com/{name}/deposit")
            print()
            balance = deposit(balance)
            print()
            print("----------------------")
        elif choice == '3':
            print("----------------------")
            print(f"www.okebank.com/{name}/withdraw")
            print()
            balance = withdraw(balance)
            print()
            print("----------------------")
        elif choice == '4':
            is_running = False
        else:
            print("----------------------")
            print("www.okebank.com/error")
            print(f"{choice} is not a valid option")
            print("----------------------")
        
    
    print(f"Thank you for using OKE bank. Have a nice day {name}.")


main()