const DIRECTIONS = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    //Diagonal \Movement
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 }
]

function distance(a, b) 
{
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function getSafestGate(user,gates)
{   
    let rankedGates;
    const availGates = gates.filter(gate => gate.role !== "CONGESTED")
    if(availGates.length > 0)
    {
        rankedGates = availGates.map((gate) => 
        {
            return {...gate,dist:distance(gate,user)}
        }).sort((a,b) => a.dist - b.dist)
    }
    else
    {
        rankedGates = gates.map((gate) => 
        {
            return {...gate,dist:distance(gate,user)}
        }).sort((a,b) => a.dist - b.dist)
    }
    
    return rankedGates?.[0] || []
}

function getCrowdCost(x, y, people) 
{
    let cost = 0
    for (const person of people) 
    {
        const INFLUENCE_RADIUS = 80
        const dx = x - person.x
        const dy = y - person.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist >= INFLUENCE_RADIUS) 
        {
            continue;
        }
        const proximity = 1 - (dist / INFLUENCE_RADIUS)
        cost += person.density * proximity * 100
    }
    return cost
}

function toGrid(point, gridSize) 
{
    return {
        x: Math.round(point.x / gridSize),
        y: Math.round(point.y / gridSize)
    }
}

function fromGrid(cell, gridSize) 
{
    return {
        x: cell.x * gridSize,
        y: cell.y * gridSize
    }
}

function key(point) 
{
    return `${point.x},${point.y}`
}

function getLowestCostNode(openSet, fScore) 
{
    let best = openSet[0]
    for (const node of openSet) 
    {
        if ((fScore.get(key(node)) ?? Infinity) < (fScore.get(key(best)) ?? Infinity)) 
        {
            best = node
        }
    }
    return best
}

function reconstructPath(cameFrom, current) 
{
    const path = [current]
    while (cameFrom.has(key(current))) 
    {
        current = cameFrom.get(key(current))
        path.push(current)
    }
    return path.reverse()
}

export function findSafePath({user,gate,heatbox,venueWidth,venueHeight,gridSize = 20}) 
{
    const start = toGrid(user, gridSize)
    const goal = toGrid(gate, gridSize)
    const maxX = Math.floor(venueWidth / gridSize)
    const maxY = Math.floor(venueHeight / gridSize)

    const crowdCosts = new Map()
    for (let x = 0; x <= maxX; x++) 
    {
        for (let y = 0; y <= maxY; y++) 
        {
            const worldX = x * gridSize
            const worldY = y * gridSize
            crowdCosts.set(`${x},${y}`,getCrowdCost(worldX, worldY, heatbox))
        }
    }
    const openSet = [start]
    const closedSet = new Set()

    const cameFrom = new Map()
    const gScore = new Map()
    const fScore = new Map()

    gScore.set(key(start), 0)
    fScore.set(key(start),distance(start, goal))
    
    while (openSet.length > 0) 
    {
        const current =getLowestCostNode(openSet,fScore);
        if (current.x === goal.x && current.y === goal.y)
        {
            const gridPath = reconstructPath(cameFrom,current)
            return gridPath.map(point =>fromGrid(point,gridSize));
        }

        const index = openSet.findIndex(node =>
            node.x === current.x &&
            node.y === current.y
        )

        if (index !== -1) 
        {
            openSet.splice(index, 1)
        }
        closedSet.add(key(current))

        for (const direction of DIRECTIONS) 
        {
            const neighbor = {x: current.x + direction.x,y: current.y + direction.y}
            if (neighbor.x < 0 || neighbor.y < 0 || neighbor.x > maxX || neighbor.y > maxY) 
            {
                continue
            }

            if (closedSet.has(key(neighbor))) 
            {
                continue
            }

            const movementCost = distance(current, neighbor)
            const crowdCost = crowdCosts.get(key(neighbor)) ?? 0
            const tentativeGScore = (gScore.get(key(current)) ?? Infinity) + movementCost +crowdCost
            const neighborKey = key(neighbor)

            if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) 
            {
                cameFrom.set(neighborKey,current)
                gScore.set(neighborKey,tentativeGScore)

                const heuristic = distance(neighbor,goal)
                fScore.set(neighborKey,tentativeGScore +heuristic)
                
                const alreadyOpen = openSet.some(node =>
                    node.x === neighbor.x &&
                    node.y === neighbor.y
                );

                if (!alreadyOpen) 
                {
                    openSet.push(neighbor)
                }
            }
        }
    }
    //No Route Found
    return [];
}