var alpha;
var ro0;
var epsilon;
var radii = [];
var guards_init = [];
var guards_inner = [];
var inner_circles = [];

var points = [];
var edges = [];

function aloupis_clear(){
	alpha;
	ro0;
	epsilon;

	radii = [];
	guards_init = [];
	guards_inner = [];
	inner_circles = [];
	points = [];
	edges = [];
	adj = [];
}

function leftorright(a,b,c){
	return Math.floor((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));
}

function checkIntersect(a,b,c,d){
	// return true if segment [a,b] intersects [c,d]
	if (leftorright(a,b,c)*leftorright(a,b,d)<=0) {
		return (leftorright(c,d,a)*leftorright(c,d,b)<0);
	}
	return false;
}

function checkIntersectAll(a,b) {
	//return true if segment [a,b] intersects at least one edge in edges
	for (i in edges){
		if (checkIntersect(a,b,points[edges[i].p1],points[edges[i].p2])){
			return true;
		}
	}

	return false;
}

function checkEdgeExists(a,b){
	for (i in edges){
		if ((edges[i].p1 == a && edges[i].p2 == b)||(edges[i].p1 == b && edges[i].p2 == a)){
			return true;
		}
	}
	return false;
}

function addEdge(x,y){
	/*add an edge going from points[x] to points[y]*/
	var a1;
	var b1;
	if (points[y].x == points[x].x){
		a1 = points[y].x;
		b1 = "NaN";
	}
	else{
		a1 = (points[y].y-points[x].y)/(points[y].x-points[x].x);
		b1 = points[y].y-a1*points[y].x;
	}
	edges.push({p1 : x, p2 : y, a : a1, b: b1});
	adj[x].push(y);
	adj[y].push(x);

}

function findEdge(a,b){
	/*return the index of the edge from a to b (or from b to a)*/
	for (i in edges){
		if ((edges[i].p1 == a && edges[i].p2 == b) || (edges[i].p1 == b && edges[i].p2 == a)){
			return i;
		}
	}
}

function dist(a,b){
	/*Return the dist from points[a] to points[b]*/
	return Math.sqrt((points[a].x-points[b].x)**2 + (points[a].y-points[b].y)**2);
}

function distCoords(x1,y1,x2,y2){
	/*Return the dist from (x1,y1) to (x2,y2)*/
	return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function minDist(a){
	/*Return the dist between points[a] and the nearest points of a in points*/
	var min = 999
	for (i in adj[a]){
		min = Math.min(min,dist(a,adj[a][i]));
	}
	return min;
}

function computeRadii(){
	for (i in points){
		radii.push(minDist(i)/2);
	}
}

function minRadius(){
	var min = 999;
	for (i in points){
		min = Math.min(min,minDist(i));
	}
	return min/2;
}

function angle(x,y,z){
	//return the angle xyz
	if (dist(x,y) > dist(y,z)){
		var tmp = z;
		z = x;
		x = tmp;
	}
	var a1;
	var a2;
	var b1;
	var b2;

	//equation l1, droite passant par x,y
	a1 = edges[findEdge(x,y)].a;
	b1 = edges[findEdge(x,y)].b;

	//equation l2, droite passant par y,z
	a2 = edges[findEdge(z,y)].a;
	b2 = edges[findEdge(z,y)].b;

	if (a1 == a2 && b1 == b2){
		return Math.acos(-1); // 180 deg
	}

	//equation l1', normale a l1 passant par x
	var aprime;
	var bprime;
	if (b1 == "NaN"){ // si la droite est verticale
		aprime = 0;
		bprime = points[x].y;
	}
	else if (a1 == 0){ // si la droite est horizontale
		aprime = points[x].x;
		bprime = "NaN";
	}
	else{
		aprime = -1/a1;
		bprime = points[x].y-aprime*points[x].x;
	}

	//coord de l intersection l1' et l2
	var px;
	if (a2 == aprime){
		return Math.acos(0); //90 deg
	}
	if (bprime == "NaN"){
		px = aprime;
	}
	else{
		px = (bprime-b2)/(a2-aprime);
	}
	var py = a2*px + b2;

	return Math.acos(dist(x,y)/distCoords(points[y].x,points[y].y,px,py));
}

function minAngle(){
	var min = 99;
	for (var i = 0 ; i<adj.length; ++i){
		for (var j = 0; j<adj[i].length-1; ++j){
			for (var k = j+1; k<adj[i].length; ++k){
				min = Math.min(min,angle(adj[i][j],i,adj[i][k]));
			}
		}
	}
	return min;
}


function pointInLine(a1,b1,x0,y0,l,direction){
	//return the point at distance l from (x0,y0) on line y=a1*x+b1
	//direction = 1 => to the right (to the bottom if vertical line)
	//direction = -1 => to the left (to the top if vertical line)
	if (a1 == 0){
		return {x:x0+direction*l, y:y0};
	}
	if (b1 == "NaN"){
		return {x:x0, y:y0+direction*l};
	}

	var A = 1 + a1**2;
	var B = a1*b1-x0-a1*y0;
	var C = x0**(2)+b1**(2)+y0**(2)-2*b1*y0-l**2;
	
	var xp = (-B + direction*Math.sqrt(B**2-A*C))/A;
	var yp = a1*xp + b1;
	
	return {x:xp, y:yp};
}

function addGuards(a1,b1,x0,y0,l,step){
	var x1;
	var y1;
	var x2;
	var y2;
	
	if (a1 == 0){ // ligne horizontale
		x1 = x0;
		y1 = y0+l;
		x2 = x0;
		y2 = y0-l;
	}
	else if (b1 == "NaN"){ // ligne verticale
		x1 = x0+l;
		y1 = y0;
		x2 = x0-l;
		y2 = y0;
	}
	else{
		a1 = -1/a1;
		b1 = (y0)-a1*(x0);
		var p1 = pointInLine(a1,b1,x0,y0,l,1);
		var p2 = pointInLine(a1,b1,x0,y0,l,-1);

		x1 = p1.x;
		y1 = p1.y;
		x2 = p2.x;
		y2 = p2.y;
	}

	if (step == 0){
		guards_init.push({x : x1, y : y1});
		guards_init.push({x : x2, y : y2});
	}
	else{
		guards_inner.push({x : x1, y : y1});
		guards_inner.push({x : x2, y : y2});
	}
}

function computeInitialGuard(a,b){
	//Compute 2 initials guards for the edge FROM a to b
	var l = Math.sqrt(radii[a]**2-epsilon**2);
	var a1 = edges[findEdge(a,b)].a;
	var b1 = edges[findEdge(a,b)].b;
	
	var direction = -1;
	if (points[b].x > points[a].x){
		direction = 1
	}

	var p = pointInLine(a1,b1,points[a].x,points[a].y,l,direction)
	addGuards(a1,b1,p.x,p.y,epsilon,0);
}

function computeInnerCircle(e) {
	var l = dist(edges[e].p1,edges[e].p2);
	l = l-radii[edges[e].p1];
	l = l-radii[edges[e].p2]; //length of unguarded seg
	
	if (l<2){
		return ;
	}

	var a1 = edges[e].a;
	var b1 = edges[e].b;
	var x0 = points[edges[e].p1].x;
	var y0 = points[edges[e].p1].y;
	var direction = -1;
	if (points[edges[e].p2].x > x0 || (points[edges[e].p2].x == x0 && points[edges[e].p2].y > y0)){
		direction = 1;
	}
	var current = pointInLine(a1,b1,x0,y0,radii[edges[e].p1]-epsilon,direction);
	var tmp = pointInLine(a1,b1,x0,y0,radii[edges[e].p1],direction);
	var deltax = tmp.x-current.x;
	var deltay = tmp.y-current.y;


	while(l>2*epsilon){
		current.x = current.x + deltax*2;
		current.y = current.y + deltay*2;
		inner_circles.push({x: current.x, y: current.y, radius: epsilon});
		addGuards(a1,b1,current.x,current.y,epsilon,1);
		l = l-2*epsilon;
	}

	if (l<2){
		return;
	}

	current.x = current.x + deltax;
	current.y = current.y + deltay;

	tmp = pointInLine(a1,b1,current.x,current.y,l/2,direction);
	inner_circles.push({x:tmp.x, y:tmp.y, radius: l/2});
	addGuards(a1,b1,tmp.x,tmp.y,l/2,1);

}

function computeInitialsGuards(){
	for (i in edges){
		computeInitialGuard(edges[i].p1,edges[i].p2);
		computeInitialGuard(edges[i].p2,edges[i].p1);
	}
}

function computeInnerCircles(){
	for (i in edges){
		computeInnerCircle(i);
	}
}

function aloupis(){
	//check if convex
	computeRadii();
	alpha = minAngle();
	ro0 = minRadius();
	epsilon = ro0 * Math.sin(alpha/2);
	computeInitialsGuards();
	computeInnerCircles();
}