const canvas = document.getElementById('grid_world');
const ctx = canvas.getContext('2d');

var playing = false;

var mat;
var phero;
var phero_colors;
var paths;

var shortest_paths;
var one_done;
var path_width;
var shortest_path_to_draw_index = -1;

var round_counter = 0;

var interval = null;
var reseted = false;

var width;
var height;
var prob0 = 0.15;
var prob1 = 0.2;
const start = {x:0, y:0};
var end;
var cell_size;
var ant_size;
var ant_draw_offset;
var nb_ants;
var ants;

var alpha = 1.0; //phero influence
var beta = 1.0; // a priori knowledge influence
const rho = 0.1; // evaporation coef
var Q; // new phero intensity (each ant add Q/length_of_it_path)
const init_pheromon = 0.1;
var sim_speed = 1.0;

const ctx_chart_line = document.getElementById('mychart');
var chart_line;

const directions = [
    [0, -1], // left  0
    [0, 1],  // right 1
    [-1, 0],  // up    2
    [1, 0]  // down  3
];
//-------------------------------------------------------------------------

function disable_buttons_form(){
    let el = document.getElementById("play-iteration-button");
    el.classList.add('btn-disabled'); el.onclick="";
    el = document.getElementById("play-pause-button");
    el.classList.add('btn-disabled'); el.onclick="";
}

function enable_buttons_form(){
    let el = document.getElementById("play-iteration-button");
    el.classList.remove('btn-disabled'); el.onclick=play_iteration_button;
    el = document.getElementById("play-pause-button");
    el.classList.remove('btn-disabled'); el.onclick=play;
}

//-------------------------------------------------------------------------

class Ant {
    constructor(id) {
        this.id = id
        this.reset();
        this.draw();
    }
    draw(){
        ctx.beginPath();
        ctx.rect(this.pix_y,
                 this.pix_x,
                 ant_size,
                 ant_size);
        ctx.fillStyle = '#444444';
        ctx.fill();
    }
    erase(){
        ctx.beginPath();
        ctx.rect(this.pix_y-1,
                 this.pix_x-1,
                 ant_size+2,
                 ant_size+2);
        ctx.fillStyle = get_cell_color(this.x,this.y); // TODO
        ctx.fill();
    }
    decide_destination(){
        if (this.done){return null;}
        let probs = [];
        for (const [dx, dy] of directions) {
            if (valid_coor(this.x+dx, this.y+dy)){
                probs.push(abs_attractiveness_transition(this.x, this.y, dx, dy));
            }
            else{
                probs.push(0.0);
            }
        }
        let sum = sum_array(probs);
        let ran = Math.random();
        probs[0] = probs[0]/sum;
        let i;
        for (i = 0; i < 4; ++i){
            if (ran < probs[i]){ break ;}
            probs[i+1] = probs[i+1]/sum + probs[i];
        }
        const [dx, dy] = id_to_d(i);
        add_paths(this.x, this.y, dx, dy, this.id)

        this.dest_x = this.x + dx;
        this.dest_y = this.y + dy;

        this.path_length++;
        this.path.push({x:this.dest_x, y:this.dest_y});

        this.dest_pix_x = (this.dest_x) * cell_size + ant_draw_offset;
        this.dest_pix_y = (this.dest_y) * cell_size + ant_draw_offset;
    }
    move(f,length){
        if (this.done){this.draw(); return null;}
        if (f == 0){
            this.delta_x = Math.round(this.dest_pix_x - this.pix_x)/length;
            this.delta_y = Math.round(this.dest_pix_y - this.pix_y)/length;
            this.pix_x += this.delta_x;
            this.pix_y += this.delta_y;
        }
        else if (f == length - 1){
            this.x = this.dest_x;
            this.y = this.dest_y;
            this.pix_x = this.dest_pix_x;
            this.pix_y = this.dest_pix_y;
            this.check_done();
        }
        else{
            this.pix_x += this.delta_x;
            this.pix_y += this.delta_y;
        }
        this.draw();
    }
    check_done(){
        this.done = (this.x == end.x) && (this.y == end.y);
    }
    reset(){
        this.x = start.x;
        this.y = start.y;
        this.pix_x = this.x * cell_size + ant_draw_offset;
        this.pix_y = this.y * cell_size + ant_draw_offset;
        this.done = false;
        this.path_length = 0;
        this.path = [{x:this.x, y:this.y}];
        this.draw();
    }
  }

//-------------------------------------------------------------------------

function inv_distance_to_goal(x,y){
    if (mat[x][y]){
        return 0;
    }
    /*
    else if (x == end.x && end.y == y){
        return 255;
    }
    else{
        return 1/Math.max(Math.abs(end.x - x), Math.abs(end.y - y));
    }*/
   return 1.0;
}

function abs_attractiveness_transition(sx,sy,dx,dy){
    return ((phero[coords_to_id(sx,sy)][d_to_id(dx,dy)])**alpha) * (inv_distance_to_goal(sx+dx,sy+dy)**beta);
}

function valid_coor(x,y){
    return ((x >= 0 && x < width ) && (y >= 0 && y < height ));
}

function get_wall_neighbours(x,y, temp){
    let res = 0;
    for (let dx = -1; dx < 2; dx++) {
        for (let dy = -1; dy < 2; dy++) {
            if (valid_coor(x+dx,y+dy)){
                if (temp[x+dx][y+dy]){ res++;}
            }
        }
    }
    return res;
}

function coords_to_id(x,y){
    return x*width + y;
}

function id_to_coords(id){
    return [Math.floor(id / width), id % width];
}

function d_to_id(dx,dy){
    if (dx == 0){
        return Math.floor((dy+1)/2);
    }
    else{
        return Math.floor((dx+1)/2)+2;
    }
}

function id_to_d(id){
    if (id >= 2){
        return [(id-2)*2-1,0];
    }
    else{
        return [0,id*2-1];
    }
}

function update_sim_speed(){
    sim_speed = parseFloat(document.getElementById('sim_speed_input').value); 
}

function update_exploitation(){
    let threshold = parseFloat(document.getElementById('exploitation_input').value)/100;
    alpha = 2.0*threshold;
    beta = 2.0 - alpha;
}

function update_printing_values(){
    height = width = document.getElementById('map_size_input').value;    
    end = {x:width-1, y:height-1};
    cell_size = Math.floor(500/width);
    ant_size = Math.floor(500/(width*3));
    ant_draw_offset = 0.5*(cell_size-ant_size);
    path_width = Math.floor(500/(width*6));
    Q = width + height - 2;
}

function sum_array(arr){
    return arr.reduce((partialSum, a) => partialSum + a, 0);
}

function draft_map(){
    let temp = [];
    for (let w = 0; w < width; w++) {
        temp.push([]);
        for (let h = 0; h < height; h++) {
            temp[w].push(Math.random() < prob0);
        }
    }
    mat = [];
    phero = Array.from({ length: width * height }, () => Array(4).fill(init_pheromon));
    for (let w = 0; w < width; w++) {
        mat.push([]);
        for (let h = 0; h < height; h++) {
            if (temp[w][h]){ mat[w].push(true);}
            else {mat[w].push(Math.random() < get_wall_neighbours(w,h,temp)*prob1);}
        }
    }
    
    mat[start.x][start.y] = false;
    mat[end.x][end.y] = false;
}

function pathExists(){
    function dfs(x, y, visited) {
        if (x === width - 1 && y === height - 1) {
            return true; // Reached the destination
        }

        visited[x][y] = true;

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (valid_coor(newX, newY) && !visited[newX][newY] && !mat[newX][newY]) {
                if (dfs(newX, newY, visited)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Initialize visited matrix
    const visited = Array.from({ length: width }, () => Array(height).fill(false));

    // Start DFS from the top-left corner (0, 0)
    return dfs(0, 0, visited);
}

function generate_map(){
    update_printing_values();
    print_results();
    nb_ants = document.getElementById('nb_ants_input').value;
    
    draft_map()
    while(!pathExists()){draft_map();}
    
    reset();
    reset_iteration();
    reseted = false;
}

function draw_map(){
    //draw the map, but erase all the ants!
    ctx.clearRect(0, 0, canvas.width*cell_size, canvas.height*cell_size);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            ctx.beginPath();
            ctx.rect(j * cell_size, i * cell_size, cell_size, cell_size);
            ctx.fillStyle = get_cell_color(i,j);
            ctx.fill();
            ctx.stroke();
        }
    }
}

function reset(){
    //draw the map and init the ants, reset phero
    shortest_paths = [];
    reseted = true;
    round_counter = 0;
    phero = Array.from({ length: width * height }, () => Array(4).fill(init_pheromon));
    update_cells_colors();
    draw_map();
    ants = [];
    for (let index = 0; index < nb_ants; index++) {
        ants.push(new Ant(index));
    }
    document.getElementById('round-counter').innerHTML = "Press start";
    print_results();
}

function add_paths(sx, sy, dx, dy, ant_id) {
    let s = coords_to_id(sx, sy);
    let d = d_to_id(dx, dy);
    paths[s][d].push(ant_id);
}

function reset_iteration(){
    one_done = false;
    paths = Array.from({ length: width*height }, () => Array.from({ length: 4 }, () => []));
    ants.forEach(ant => { ant.reset();});
    draw_map();
}

async function play_round(){
    let done = true;
    let nb_frames;
    ants.forEach(ant => { ant.decide_destination();});

    nb_frames = Math.round(60/sim_speed)
    for (let frame = 0; frame < nb_frames; frame++) {
        draw_map();
        ants.forEach(ant => { ant.move(frame, nb_frames);});
        draw_shortest_path();
        await sleep(1);
    }
    ants.forEach(ant => { 
        if (ant.done && !one_done){
            one_done = true;
            shortest_paths.push({it:round_counter, length:ant.path_length, path:ant.path})
            update_shortest_paths();
        }
        done = done && ant.done;});
    return done;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function play_iteration(){
    reset_iteration();
    round_counter++;
    document.getElementById('round-counter').innerHTML = "Iteration "+ round_counter;
    done = false;
    while ( !reseted && !done){done = await play_round();}
    if (!reseted) {
        update_pheromon();
        update_results();
    }
}

async function play_iteration_button(){
    reseted = true;
    playing = true;
    disable_buttons_form();
    await play_iteration();
    enable_buttons_form();
    playing = false;
}

async function play(){
    reseted = false;
    playing = true;
    disable_buttons_form();
    for (let i = 0; i<10; ++i) {
        await play_iteration();
        if (reseted){break;}
    }
    enable_buttons_form();
    playing = false;
}

function update_pheromon(){
    for (let cell = 0; cell < width*height; ++cell){
        for (let d = 0; d < 4; ++d){
            phero[cell][d] *= (1-rho);
            for (let ai of paths[cell][d]){
                phero[cell][d] += Q/ants[ai].path_length;
            }
        }
    }
    update_cells_colors();
    draw_map();
}

function get_cell_color(x,y){
    if (mat[x][y]){return "#000000";}
    return phero_colors[coords_to_id(x,y)];
}

function update_cells_colors(){
    phero_colors = [];
    if (round_counter == 0){
        for (let i = 0; i < width*height; ++i){phero_colors[i] = "#ffffff";}
        phero_colors[coords_to_id(start.x, start.y)] = "#73c2fb";
        phero_colors[coords_to_id(end.x, end.y)] = "#0000ff";    
        return null;
    }
    let max = 0.0;
    for (let i = 0; i < width*height; ++i){
        phero_colors[i] = sum_array(phero[i]);
        max = Math.max(phero_colors[i], max);
    }
    let r = 255, g = 255, b = 255;
    let percent;
    for (let i = 0; i < width*height; ++i){
        percent = phero_colors[i]/max;
        if (percent <= 0.5) {
            // From green to yellow
            g = 255;
            b = Math.floor(255 * (1 - (percent * 2)));
        } else {
            // From yellow to red
            g = Math.floor(255 * (1 - (percent - 0.5) * 2)); // Decreasing from 200 to 0
            b = 0;                               // No blue
        }
        phero_colors[i] = `rgb(${r},${g},${b})`;
    }
    phero_colors[coords_to_id(start.x, start.y)] = "#73c2fb";
    phero_colors[coords_to_id(end.x, end.y)] = "#0000ff";

}

function print_results(){
    if (typeof chart_line !== 'undefined' && chart_line !== null) {
        chart_line.destroy();
    }
    chart_line = new Chart(ctx_chart_line, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Average length',
                data: [],
                borderWidth: 1,
                borderColor : "#000fff",
                backgroundColor: "#73c2fb"
            },
            {
                label: 'Minimum length',
                data: [],
                borderWidth: 1,
                borderColor : "#00771e",
                backgroundColor : "#8fce00"
            },
            {
                label: 'Maximum length',
                data: [],
                borderWidth: 1,
                borderColor : "#af0000",
                backgroundColor : "#f44336"
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
}

function update_results(){
    let average = 0; let min = 2047; let max = -1;
    ants.forEach(ant => {
        average += ant.path_length;
        if (ant.path_length < min) min = ant.path_length;
        if (ant.path_length > max) max = ant.path_length;
    });
    const data_cl = chart_line.data;
    if (round_counter > 9){
        data_cl.labels = range(round_counter-8,round_counter+1);
        data_cl.datasets[0].data.shift();
        data_cl.datasets[1].data.shift();
        data_cl.datasets[2].data.shift();
    }
    else{
        data_cl.labels = range(1,round_counter+1);
    }
    data_cl.datasets[0].data.push(average/nb_ants);
    data_cl.datasets[1].data.push(min);
    data_cl.datasets[2].data.push(max);
    chart_line.update();
}

function update_shortest_paths(){
    if (round_counter > 5){
        shortest_paths.shift();
    }
    let txt = '';
    shortest_paths.forEach(sp => {
        txt += '<tr style="cursor:help;" onmouseenter="shortest_path_to_draw_index='+sp.it+'" onmouseleave="shortest_path_to_draw_index=-1"><th scope="row">'+sp.it+'</th><td>'+sp.length+'</td></tr>';
        }
    )    
    document.getElementById("shortest_paths-table").innerHTML = txt;
}

function draw_shortest_path(){
    let index = shortest_path_to_draw_index;
    if (index < 0){return null;}
    
    index -= 1;
    if (round_counter > 5){ index -= round_counter - 5;}
    index = Math.max(index, 0);
    
    for (let i = 0; i < shortest_paths[index].length; i++) {
        ctx.beginPath();
        if (shortest_paths[index].path[i].x == shortest_paths[index].path[i+1].x){
            ctx.rect(Math.min(shortest_paths[index].path[i].y, shortest_paths[index].path[i+1].y) * cell_size + 0.5*cell_size - 0.5*path_width,
                     shortest_paths[index].path[i].x * cell_size + 0.5*cell_size - 0.5*path_width,
                     cell_size + path_width,
                     path_width);
        }
        else{
            ctx.rect(shortest_paths[index].path[i].y * cell_size + 0.5*cell_size - 0.5*path_width,
                     Math.min(shortest_paths[index].path[i].x, shortest_paths[index].path[i+1].x) * cell_size + 0.5*cell_size - 0.5*path_width,
                     path_width,
                     cell_size + path_width);
        }
        ctx.fillStyle = "rgb(125, 000, 0)";
        ctx.fill();
    }
    
}

async function draw_shortest_path_loop(){
    let prev_val = shortest_path_to_draw_index;
    while(true){
        await sleep(5);
        if (!playing){
        if (shortest_path_to_draw_index != prev_val){
        if (prev_val != -1){ draw_map();}
        if (shortest_path_to_draw_index != -1){
            draw_shortest_path();
        }
        prev_val = shortest_path_to_draw_index;
        }
        }
    }
}

// -----------------------------------------------------------

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

generate_map();
draw_shortest_path_loop();
// Attach event listeners to the input elements
const debouncedGetNetworkSettings = debounce(generate_map, 300);

document.getElementById('nb_ants_input').addEventListener('input', debouncedGetNetworkSettings);
document.getElementById('map_size_input').addEventListener('input', debouncedGetNetworkSettings);
document.getElementById('sim_speed_input').addEventListener('input', update_sim_speed);
document.getElementById('exploitation_input').addEventListener('input', update_exploitation);