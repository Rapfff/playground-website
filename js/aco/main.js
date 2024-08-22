const canvas = document.getElementById('grid_world');
const ctx = canvas.getContext('2d');

var mat;
var phero;
var paths;
var round_counter = 0;
var interval = null;
var reseted = false;
var width;
var height;
var prob0 = 0.1;
var prob1 = 0.2;
const start = {x:0, y:0};
var end;
const cell_size = Math.floor(500/width);
var nb_ants;
const ant_size = Math.floor(500/(width*3));
const ant_draw_offset = 0.5*(cell_size-ant_size);
var ants;
const alpha = 1.0;
const beta = 1.0;
const rho = 0.1;
const Q = 50;
const init_pheromon = 0.1;

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
        ctx.rect(this.y * cell_size + ant_draw_offset,
                 this.x * cell_size + ant_draw_offset,
                 ant_size,
                 ant_size);
        ctx.fillStyle = '#000000';
        ctx.fill();
    }
    erase(){
        ctx.beginPath();
        ctx.rect(this.y * cell_size + ant_draw_offset,
                 this.x * cell_size + ant_draw_offset,
                 ant_size,
                 ant_size);
        if (this.y == end.y && this.x == end.x){ ctx.fillStyle = "#8fce00"}
        else if (this.y == start.y && this.x == start.x){ ctx.fillStyle = "#dc052d"}
        else { ctx.fillStyle = '#fff';}
        ctx.fill();
    }
    move(){
        if (this.done){return null;}
        this.erase();
        let probs = [];
        for (let dx = -1; dx < 2; dx++) {
            for (let dy = -1; dy < 2; dy++) {
                if (valid_coor(this.x+dx, this.y+dy)){
                    probs.push(abs_attractiveness_transition(this.x, this.y, dx, dy));
                }
                else{
                    probs.push(0.0);
                }
            }
        }
        probs[4] = 0.0;
        let sum = probs.reduce((partialSum, a) => partialSum + a, 0);
        let ran = Math.random();
        probs[0] = probs[0]/sum;
        let i;
        for (i = 0; i < 9; ++i){
            if (ran < probs[i]){ break ;}
            probs[i+1] = probs[i+1]/sum + probs[i];
        }

        let dx = Math.floor(i/3) - 1;
        let dy = (i % 3) - 1;
        add_paths(this.x, this.y, dx, dy, this.id)
        this.x = this.x + dx;
        this.y = this.y + dy;
        this.check_done();
        this.path_length++;
        this.draw();
    }
    check_done(){
        this.done = (this.x == end.x) && (this.y == end.y);
    }
    reset(){
        this.erase();
        this.x = start.x;
        this.y = start.y;
        this.done = false;
        this.path_length = 0;
        this.draw();
    }
  }

//-------------------------------------------------------------------------

function inv_distance_to_goal(x,y){
    if (mat[x][y]){
        return 0;
    }
    else if (x == end.x && end.y == y){
        return 255;
    }
    else{
        return 1/Math.max(Math.abs(end.x - x), Math.abs(end.y - y));
    }
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
    return (dx+1)*3 + dy+1;
}

function id_to_d(id){
    return [Math.floor(id / 3) - 1, (id % 3) - 1];
}

function generate_map(){
    nb_ants = document.getElementById('nb_ants_input').value;
    height = width = document.getElementById('map_size_input').value;    
    end = {x:width-1, y:height-1};
    
    let temp = [];
    for (let w = 0; w < width; w++) {
        temp.push([]);
        for (let h = 0; h < height; h++) {
            temp[w].push(Math.random() < prob0);
        }
    }
    mat = [];
    phero = Array.from({ length: width * height }, () => Array(9).fill(init_pheromon));
    for (let w = 0; w < width; w++) {
        mat.push([]);
        for (let h = 0; h < height; h++) {
            if (temp[w][h]){ mat[w].push(true);}
            else {mat[w].push(Math.random() < get_wall_neighbours(w,h,temp)*prob1);}
        }
    }
    
    mat[start.x][start.y] = false;
    mat[end.x][end.y] = false;
    for (let w = 0; w < width; w++) {
        mat[w][0] = false;
    }
    for (let h = 0; h < height; h++) {
        mat[width-1][h] = false;
    }
    reset();
    reset_iteration();
}

function reset(){
    //draw the map and init the ants
    reseted = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log(width, height, start, end, mat);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            ctx.beginPath();
            ctx.rect(j * cell_size, i * cell_size, cell_size, cell_size);
            if (i == end.y && j == end.x){ ctx.fillStyle = "#8fce00"}
            else if (i == start.y && j == start.x){ ctx.fillStyle = "#dc052d"}
            else { ctx.fillStyle = mat[i][j] ? '#61dafb' : '#fff';}
            ctx.fill();
            ctx.stroke();
        }
    }
    ants = [];
    for (let index = 0; index < nb_ants; index++) {
        ants.push(new Ant(index));
    }
    document.getElementById('round-counter').innerHTML = "Press start";
    round_counter = 0;
}

function add_paths(sx, sy, dx, dy, ant_id) {
    let s = coords_to_id(sx, sy);
    let d = d_to_id(dx, dy)
    paths[s][d].push(ant_id);
}

function reset_iteration(){
    ants.forEach(ant => {
        ant.reset();
    });
    paths = Array.from({ length: width*height }, () => Array.from({ length: 9 }, () => []));
}

function play_round(){
    let done = true;
    ants.forEach(ant => {
        ant.move();
        done = done && ant.done;
    });
    return done;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function play_iteration(){
    reset_iteration();
    round_counter++;
    document.getElementById('round-counter').innerHTML = "Round "+ round_counter;
    while ( !reseted && !play_round()){await sleep(100);}
    if (!reseted) {
        update_pheromon();
    }
}

async function play_iteration_button(){
    reseted = false;
    disable_buttons_form();
    await play_iteration();
    enable_buttons_form();
}

async function play(){
    reseted = false;
    disable_buttons_form();
    for (let i = 0; i<10; ++i) {
        await play_iteration();
        if (reseted){break;}
    }
    enable_buttons_form();
}

function update_pheromon(){
    for (let cell = 0; cell < width*height; ++cell){
        for (let d = 0; d < 9; ++d){
            phero[cell][d] *= (1-rho);
            for (let ai of paths[cell][d]){
                phero[cell][d] += Q/ants[ai].path_length;
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
// Attach event listeners to the input elements
const debouncedGetNetworkSettings = debounce(generate_map, 300);

document.getElementById('nb_ants_input').addEventListener('input', debouncedGetNetworkSettings);
document.getElementById('map_size_input').addEventListener('input', debouncedGetNetworkSettings);
//document.getElementById('sim_speed_input').addEventListener('input', debouncedGetNetworkSettings);

