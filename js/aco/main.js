const canvas = document.getElementById('grid_world');
const ctx = canvas.getContext('2d');

var mat;
var phero;
var paths;
var interval = null;
const width = 10;
const height = 10;
var prob0 = 0.1;
var prob1 = 0.2;
const start = {x:0, y:0};
const end = {x:width-1, y:height-1};
const cell_size = Math.floor(500/width);
var nb_ants = 1;
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
        ctx.fillStyle = '#fff';
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
        this.x = start.x;
        this.y = start.y;
        this.done = false;
        this.path_length = 0;
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
}

function reset(){
    //draw the map and init the ants
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            ctx.beginPath();
            ctx.rect(j * cell_size, i * cell_size, cell_size, cell_size);
            ctx.fillStyle = mat[i][j] ? '#61dafb' : '#fff';
            ctx.fill();
            ctx.stroke();
        }
    }
    ants = [];
    for (let index = 0; index < nb_ants; index++) {
        ants.push(new Ant(index));
    }
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
    //move the ants
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
    while (!play_round()){await sleep(10);}
    update_pheromon();
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

generate_map();
reset();
reset_iteration();