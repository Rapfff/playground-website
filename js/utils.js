function range(start, stop, step) {
    // Handle the case where only one argument is provided
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    
    // Set default step if it is not provided
    if (step === undefined) {
        step = 1;
    }
    
    // Calculate the length of the array to be created
    const length = Math.max(Math.ceil((stop - start) / step), 0);
    
    // Create the array
    const array = new Array(length);
    
    for (let i = 0; i < length; i++, start += step) {
        array[i] = start;
    }
    
    return array;
}

//-------------------------------------------------------------------------

function updateBubble(rangeInput) {
    const bubble = rangeInput.nextElementSibling;
    bubble.textContent = rangeInput.value;
    const percent = (rangeInput.value - rangeInput.min) / (rangeInput.max - rangeInput.min) * 100;
    bubble.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`;
    showBubble(rangeInput);
}

function showBubble(rangeInput) {
    const bubble = rangeInput.nextElementSibling;
    bubble.style.opacity = 1;
}

function hideBubble(rangeInput) {
    const bubble = rangeInput.nextElementSibling;
    bubble.style.opacity = 0;
}