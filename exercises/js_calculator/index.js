

const display = document.getElementById("display")
let hiddenExpression = "";
let tempResult = "";

function appendToDisplay(input) {
    const operators = ["*", "-", "+", "/"];

    // If the input is an operator
    if (operators.includes(input)) {
        display.value = "";

        if (hiddenExpression !== "") {
            try {
                tempResult = eval(hiddenExpression);
            } catch (error) {
                display.value = "Error";
            }
            display.value =tempResult;
        }
        //display.value =tempResult;
        hiddenExpression += input;
        display.value += input;
    } else {
        display.value += input;
        hiddenExpression += input;
    }

}


function clearDisplay(){
    display.value = "";
    hiddenExpression= "";
}


function calculate(){
    try {
        console.log("Evaluating expression:", hiddenExpression);
        display.value = eval(hiddenExpression);
        hiddenExpression = display.value;
    } catch (error) {
        display.value = "Error";
        hiddenExpression = "";
    }
    
}
