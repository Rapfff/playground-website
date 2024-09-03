var mat, strats, nbNodes, param, defectProb;
var graphType, nodes, edges, network;

var R, S, T, P;

var paused = true;
var interval = null;
var round_counter = 0;
var chart_line, chat_doughnut;
const ctx_chart_line = document.getElementById('mychart');
const ctx_chart_doughnut = document.getElementById('mychart2');



//-------------------------------------------------------------------------

function get_deg(i){
    return mat[i].reduce((partialSum, a) => partialSum + a, 0);
}

function binomialCoeff2(n) {
    return (n * (n - 1)) / 2;
}

function get_network_settings() {
    // Get the value of the range inputs
    nbNodes = document.getElementById('nb_node_input').value;
    graphType = document.querySelector('input[name="graph_type"]:checked').value;
    
    let min, max;
    if (graphType == 'random') {
        min = 1;
        max = binomialCoeff2(nbNodes);
    }
    else {
        min = 2;
        max = nbNodes;
    }
    document.getElementById('param_input').min = min;
    document.getElementById('range-param-min').innerHTML = min;
    document.getElementById('param_input').max = max;
    document.getElementById('range-param-max').innerHTML = max;
    
    param = document.getElementById('param_input').value;
    param = Math.min(param,max);
    param = Math.max(param,min);
    document.getElementById('param_input').value = param;
    document.getElementById('range-bubble-param').innerHTML = param;

    defectProb = document.getElementById('prob_defect_input').value;
}

function mat_filter_bottom_left(mat){
    let res = [];
    for (let i=0; i < mat.length; ++i){
        res[i] = [];
        for (let j=0; j < mat.length; ++j){
            if (j>=i){res[i][j] = 0;}
            else{res[i][j] = mat[i][j];}
        }
    }
    return res;
}


async function create_net() {
    enable_disable_form(true, true, true);
    reset_counter();
    get_network_settings();
    // Your heavy function implementation here
    defectProb = defectProb/100;
    if (graphType === "random") {
        create_random_net_matrix();
    }
    else {
        create_scalefree_net_matrix();
    }

    strats = [];
    for (let i=0; i<nbNodes; ++i){
        strats[i] =  Math.random() < defectProb;
    }


    
    // Create a network
    create_graph_from_adjMatrix();
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodes, edges: edges };
    const options = {
        layout: {
            improvedLayout: true // Enable the layout optimizer to minimize edge crossings
        },
        physics: {
            enabled: true, // Enable physics to make the graph look better
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.08
            },
            maxVelocity: 10,
            minVelocity: 0.1,
            stabilization: {
                enabled: true,
                iterations: 1000,
                updateInterval: 25
            }
        },
        nodes: {
            shape: "dot",
            size: 10
        },
        edges: {
            color : "#ffffff",
            width : 1.2
        }
    };
    network = new vis.Network(container, data, options);
    network.on("stabilizationProgress", function (params) {
        document.getElementById("loadingBar").style.opacity = 1;
        var maxWidth = 496;
        var minWidth = 20;
        var widthFactor = params.iterations / params.total;
        var width = Math.max(minWidth, maxWidth * widthFactor);

        document.getElementById("bar").style.width = width + "px";
        document.getElementById("text").innerText =
          Math.round(widthFactor * 100) + "%";
      });
      network.once("stabilizationIterationsDone", function () {
        document.getElementById("text").innerText = "100%";
        document.getElementById("bar").style.width = "496px";
        document.getElementById("loadingBar").style.opacity = 0;
        enable_disable_form(false, true, true);
        // really clean the dom element
        /*setTimeout(function () {
          document.getElementById("loadingBar").style.display = "none";
        }, 500);*/
    });
    print_results();
}

function create_graph_from_adjMatrix() {
    adjMatrix = mat_filter_bottom_left(mat);
    nodes = [];
    edges = [];
    const numNodes = adjMatrix.length;

    // Create nodes
    for (let i = 0; i < numNodes; i++) {
        if (strats[i])  {nodes.push({ id: i, color: "red"});}
        else            {nodes.push({ id: i, color: "green"});}
        
    }

    // Create edges
    for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < numNodes; j++) {
            if (adjMatrix[i][j] !== 0) {
                edges.push({ from: i, to: j });
            }
        }
    }
    nodes = new vis.DataSet(nodes);
    edges = new vis.DataSet(edges);
}

function create_scalefree_net_matrix() {
    // Initialize the matrix
    param = parseInt(param);
    mat = [];
    for (let i=0; i < nbNodes; ++i){mat[i] = []; for (let j=0; j < nbNodes; ++j){mat[i][j] = 0;}}
    
    for (let i = 0; i < param; i++) {
        for (let j = 0; j < param; j++) {
            if (i !== j) {
                mat[i][j] = 1;
            }
        }
    }
    let nb_edges = binomialCoeff2(param);
    let rand, k, sum_k;
    for (let curr_node = param; curr_node < nbNodes; curr_node++) {
        let probs = [], temp = [];
        for (let j = 0; j < curr_node; j++) {
            probs.push(get_deg(j) / nb_edges);
            temp.push(0);
        }
        for (let curr_edge = 0; curr_edge < param; ++curr_edge){
            rand = Math.random() * probs.reduce((partialSum, a) => partialSum + a, 0);
            k = 0, sum_k = probs[0];
            while (rand > sum_k) {
                ++k;
                sum_k += probs[k];
            }
            temp[k] = 1;
            probs[k] = 0.0;
        }
        for (let j = 0; j < curr_node; j++) {
            if (temp[j] === 1) {mat[curr_node][j] = 1; mat[j][curr_node] = 1;}
            else{               mat[curr_node][j] = 0; mat[j][curr_node] = 0;}
        }
        nb_edges += param;
    }

}

function create_random_net_matrix() {
    // Check the most efficient way to proceed
    var flag  = false;
    max_edges = binomialCoeff2(nbNodes);
    if (param > max_edges/2){
        flag = true;
        param = max_edges - param;
    }
    // Initialize the matrix
    mat = [];
    for (let i=0; i < nbNodes; ++i){mat[i] = []; for (let j=0; j < nbNodes; ++j){mat[i][j] = 0;}}
    // Randomly set param edges
    let k = 0;
    while (k < param) {
        let i = Math.floor(Math.random() * nbNodes);
        let j = Math.floor(Math.random() * nbNodes);
        if (mat[i][j] === 0 && i !== j) {
            mat[i][j] = 1;
            mat[j][i] = 1;
            k++;
        }
    }
    // if necessary, inverse the matrix
    if (flag) {
        for (let i = 0; i < nbNodes; i++) {
            for (let j = 0; j < nbNodes; j++) {
                mat[i][j] = (mat[i][j] === 0 && i !== j) ? 1 : 0;
            }
        }
    }
}

//-------------------------------------------------------------------------

function enable_disable_form(val_form, play_round_also, play_pause_also) {
    var form = document.getElementById('graph-settings-form');
    Array.from(form.elements).forEach(el => el.disabled = val_form);
    form = document.getElementById('penalties-form');
    Array.from(form.elements).forEach(el => el.disabled = val_form);

    if (play_round_also){
        let el = document.getElementById("play-round-button");
        if (val_form){ el.classList.add('btn-disabled'); el.onclick="";
                
        }
        else    { el.classList.remove('btn-disabled'); el.onclick=round;}
    }
    if (play_pause_also){
        let el = document.getElementById("play-pause-button");
        if (val_form){ el.classList.add('btn-disabled'); el.onclick="";
                
        }
        else    { el.classList.remove('btn-disabled'); el.onclick=play;}
    }

}

function reset_counter(){
    round_counter = 0;
    document.getElementById('round-counter').innerHTML = "Press start";
}

function get_penalties(){
    R = document.getElementById('input-R').value;
    T = document.getElementById('input-T').value;
    S = document.getElementById('input-S').value;
    P = document.getElementById('input-P').value;
}

function update_round_counter(){
    round_counter++;
    document.getElementById('round-counter').innerHTML = "Round "+round_counter;
}

function choose_neighbour(arr) {
    // Collect all indices where the value is 1
    const indices = arr.map((value, index) => value === 1 ? index : null).filter(index => index !== null);
    
    // Return null if no indices found
    if (indices.length === 0) return null;

    // Randomly select one of these indices
    const randomIndex = Math.floor(Math.random() * indices.length);
    
    return indices[randomIndex];
}

function game(p1, p2){
    if      (p1 && p2)  { return { t1: P, t2: P};}
    else if (!p1 && !p2){ return { t1: R, t2: R};}
    else if (!p1 && p2) { return { t1: S, t2: T};}
    else                { return { t1: T, t2: S};}
}

function play_round(){
    let payoffs = [];
    for (let j=0; j < nbNodes; ++j){payoffs[j] = 0;}
    for (let p1 = 0; p1 < nbNodes - 1; ++p1){
        for (let p2 = p1+1; p2 < nbNodes; ++p2){
            if (mat[p1][p2] === 1){   
                let { t1, t2} = game(strats[p1], strats[p2]);
                payoffs[p1] += t1;
                payoffs[p2] += t2; 
            }
        }
    }
    return payoffs;
}

function update_round(payoffs){
    let new_strats = [];
    for (let i = 0; i < nbNodes; ++i){
        new_strats[i] = strats[i];
        j = choose_neighbour(mat[i]);
        if (payoffs[j] > payoffs[i]){
            let prob = (payoffs[j] - payoffs[i])/(Math.max(get_deg(i),get_deg(j))*(Math.max(T,R)-Math.min(S,P)));
            if (Math.random() < prob) {
                new_strats[i] = strats[j];
                var to_update_node = nodes.get(i);
                if (new_strats[i]){to_update_node.color =   "red"; }
                else              {to_update_node.color = "green"; }
                nodes.update(to_update_node);
            }
        }
    }
    strats = new_strats;
}

function round(){
    get_penalties();
    update_round(play_round());
    update_round_counter();
    update_results();
}

//-------------------------------------------------------------------------

function play(){
    let button = document.getElementById("play-pause-button-i");
    button.classList.add('icon-control-pause');
    button.classList.remove('icon-control-play');
    paused = false;
    enable_disable_form(true,true,false);
    document.getElementById("play-pause-button").onclick = pause;

    if (interval) {
        clearInterval(interval);
    }
    // Set the interval to execute the function f every x milliseconds
    interval = setInterval(round, 500);
}

function pause(){
    let button = document.getElementById("play-pause-button-i");
    button.classList.add('icon-control-play');
    button.classList.remove('icon-control-pause');
    paused = true;
    enable_disable_form(false,true,false);
    document.getElementById("play-pause-button").onclick = play;

    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

function reset(){
    reset_counter();
    if (!paused){
        pause();
    }
    let new_strat = null;
    for (let i=0; i<nbNodes; ++i){
        new_strat =  Math.random() < defectProb;
        if (new_strat !== strats[i]){
            strats[i] = new_strat;
            var to_update_node = nodes.get(i);
            if (new_strat){to_update_node.color =   "red"; }
            else          {to_update_node.color = "green"; }
            nodes.update(to_update_node);
        }
    }
    print_results();
}

//-------------------------------------------------------------------------

function print_results(){
    let val = (strats.reduce((count, value) => count + (value ? 1 : 0), 0));
    if (typeof chart_line !== 'undefined' && chart_line !== null) {
        chart_line.destroy();
    }
    chart_line = new Chart(ctx_chart_line, {
        type: 'line',
        data: {
            labels: [0],
            datasets: [{
                label: 'defectors (%)',
                data: [100*val/nbNodes],
                borderWidth: 1,
                borderColor : "#f86257",
                backgroundColor: "#f44336"
            },
            {
                label: 'collaborators (%)',
                data: [100-(100*val/nbNodes)],
                borderWidth: 1,
                borderColor : "#aed25c",
                backgroundColor : "#8fce00"
            }]
            },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: 'white', // Legend text color,
                    }
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: 'white' // X-axis labels color
                    },
                },
                y: {
                    ticks: {
                        color: 'white' // X-axis labels color
                    },
                    suggestedMin : 0,
                    suggestedMax : 100
                }
            }
        }
    });
    if (typeof chart_doughnut !== 'undefined' && chart_doughnut !== null) {
        chart_doughnut.destroy();
    }
    chart_doughnut = new Chart(ctx_chart_doughnut, {
        type: 'doughnut',
        data: {
            labels: ['Defectors','Collaborators'],
            datasets: [{
                label: ' ',
                data: [val, nbNodes-val],
                backgroundColor: ["#f44336","#8fce00"],
                hoverOffset: 4
            }]
            },
        options: {
            plugins: {
                legend: {
                    display: false
                },
            }
        }
    });
}
function update_results(){
    let val = strats.reduce((count, value) => count + (value ? 1 : 0), 0);
    const data_cd = chart_doughnut.data;
    data_cd.datasets[0].data[0] = val;
    data_cd.datasets[0].data[1] = nbNodes-val;
    chart_doughnut.update();

    val = 100*val/nbNodes;
    const data_cl = chart_line.data;
    data_cl.labels = range(round_counter+1);
    data_cl.datasets[0].data.push(val);
    data_cl.datasets[1].data.push(100-val);
    chart_line.update();
}

//-------------------------------------------------------------------------


// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

create_net();
// Attach event listeners to the input elements
const debouncedGetNetworkSettings = debounce(create_net, 300);

document.getElementById('nb_node_input').addEventListener('input', debouncedGetNetworkSettings);
document.getElementById('param_input').addEventListener('input', debouncedGetNetworkSettings);
document.getElementById('prob_defect_input').addEventListener('input', debouncedGetNetworkSettings);
document.querySelectorAll('input[name="graph_type"]').forEach((elem) => {
    elem.addEventListener('change', create_net);
});

