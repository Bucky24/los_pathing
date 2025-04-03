class Los {
    constructor(width, height, start, end, walls, settings = null) {
        this.width = width;
        this.height = height;
        this.start = start;
        this.end = end;
        this.walls = walls;
        this.endPoints = {};
        this.preComputedPoints = {};
        this.allPoints = null;
        this.validPath = null;
        this.queue = [];
        this.processed = {};
        this.position = [];

        if (settings) {
            this.overridePoints = settings.overridePoints;
            this.maxDistToLine = settings.maxDistToLine;
        }
    }

    static keyPoint(point) {
        return `${point[0]},${point[1]}`;
    }

    static getPathCost(path) {
        let cost = 0;
        let last = null;
        for (let item of path) {
            if (last) {
                const dist = Math.sqrt(Math.pow(last[0] - item[0],2) + Math.pow(last[1]-item[1] ,2));
                cost += dist;
            }
            last = item;
        }
    
        return cost;
    }

    preCompute() {
        if (this.overridePoints) {
            this.endPoints = {
                [this.keyPoint(this.end)]: [this.end],
            };
            return;
        }
        this.endPoints = this.getPointsFromPosition(this.end).reduce((obj, point) => {
            const key = Los.keyPoint(point);
            const newObj = {
                ...obj,
                [key]: [
                    point,
                    end,
                ],
            };
    
            return newObj;
        }, {});

        //console.log(this.endPoints);
    }

    getPointsFromPosition(position) {
        const key = Los.keyPoint(position);
        if (this.preComputedPoints[key]) {
            return this.preComputedPoints[key];
        }
        //console.log('begin get points', position);
        let { points, lines } = this.getAllPoints();
    
        // filter out points we can't see
        points = points.filter((point) => {
            if (point[0] === position[0] && point[1] === position[1]) {
                // if this point is our current position ignore it
                return false;
            }
            for (const line of lines) {
                const intersect = doLinesIntersect(
                    [position[0], position[1]], [point[0], point[1]],
                    [line[0], line[1]], [line[2], line[3]],
                );
                if (intersect) {
                    return false;
                }
            }
    
            return true;
        }).map((point) => [...point]);
    
        //console.log('after filter', points.length);
    
        this.preComputedPoints[key] = points;
    
        return points;
    }

    getAllPoints() {
        if (this.allPoints) {
            return this.allPoints;
        }

        let points = [];
        const lines = [];

        points.push([...this.end]);

        for (let i=0;i<this.walls.length;i++) {
            const wall = this.walls[i];

            const cx = (Math.abs(wall[0] - wall[2]) / 2) + Math.min(wall[0], wall[2]);
            const cy = (Math.abs(wall[1] - wall[3]) / 2) + Math.min(wall[1], wall[3]);

            const key = `wall_${i}`;

            const addablePoints = [
                [wall[0], wall[1]],
                [wall[2], wall[1]],
                [wall[0], wall[3]],
                [wall[2], wall[3]]
            ];

            for (const point of addablePoints) {
                // move a bit away from the center
                let ux = point[0] - cx;
                ux = ux / Math.abs(ux);

                let uy = point[1] - cy;
                uy = uy / Math.abs(uy);

                // these three points basically give us a big of a curve around the corner
                points.push([
                    point[0] + ux * 1,
                    point[1] + uy * 1,
                    key,
                ]);

                /*points.push([
                    point[0] + ux * 1,
                    point[1],
                    key,
                ]);

                points.push([
                    point[0],
                    point[1] + uy * 1,
                    key,
                ]);*/
            }

            lines.push([wall[0], wall[1], wall[2], wall[1]]);
            lines.push([wall[2], wall[1], wall[2], wall[3]]);
            lines.push([wall[2], wall[3], wall[0], wall[3]]);
            lines.push([wall[0], wall[3], wall[0], wall[1]]);
        }

        // add points involving the outer edge of the map
        for (let i=0;i<=this.width;i+=Math.floor(this.width / 4)) {
            points.push([i, 0, 'outer']);
            points.push([i, height, 'outer']);
        }

        for (let i=0;i<=this.height;i+=Math.floor(this.height / 4)) {
            points.push([0, i, 'outer']);
            points.push([width, i, 'outer']);
        }

        // now calculate halfway points between everything

        const length = points.length;
        for (let i = 0;i<length;i++) {
            for (let j=i+1;j<length;j++) {
                if (j === i) {
                    continue;
                }

                if (points[i][2] === points[j][2]) {
                    // if points are from the same source, quit
                    continue;
                }

                const distX = Math.max(points[i][0], points[j][0]) - Math.min(points[i][0], points[j][0]);
                const distY = Math.max(points[i][1], points[j][1]) - Math.min(points[i][1], points[j][1]);

                points.push([
                    Math.min(points[i][0], points[j][0]) + distX / 2,
                    Math.min(points[i][1], points[j][1]) + distY / 2,
                ]);
            }
        }

        // remove dupes
        const seen = new Set();
        points = points.filter((point) => {
            if (point[0] < 0 || point[1] < 0 || point[0] > width || point[1] > height) {
                return false;
            }

            const key = `${point[0]},${point[1]}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);

            return true;
        })

        // filter points that are close together
        let filteredPoints = [];
        for (const point of points) {
            let skip = false;
            for (const filtered of filteredPoints) {
                const dist = Math.sqrt(Math.pow(point[0] - filtered[0], 2) + Math.pow(point[1] - filtered[1], 2));

                if (dist < 20) {
                    skip = true;
                    break;
                }
            }

            if (!skip) {
                filteredPoints.push(point);
            }
        }

        // filter out points that are too close to lines
        filteredPoints = filteredPoints.filter((point) => {
            for (const line of lines) {
                const dist = distanceFromLine([ {x: line[0], y: line[1]}, {x: line[2], y: line[3]}], {x: point[0], y: point[1] });
                if (dist < this.maxDistToLine) {
                    return false;
                }
            }

            return true;
        })
        //console.error('loop done', points.length);

        allPoints = {
            points: overridePoints || filteredPoints,
            lines,
        };

        return allPoints;
    }

    getEndPoints() {
        return this.endPoints;
    }

    setValidPath(path) {
        const cost = Los.getPathCost(path);
        if (!this.validPath || cost < Los.getPathCost(this.validPath)) {
            this.validPath = path;
        } else {
            //console.log("Rejecting path", path, "cost too much");
        }
    }

    getValidPath() {
        return this.validPath;
    }

    addToQueue(position, path) {
        // don't allow loops in the path
        for (const item of path) {
            if (item[0] === position[0] && item[1] === position[1]) {
                return;
            }
        }
    
        const key = Los.keyPoint(position);
    
        const cost = Math.sqrt(Math.pow(position[0] - end[0], 2) + Math.pow(position[1] - end[1], 2));
        let pathCost = 0;
        let previous = null;
        for (const point of path) {
            if (previous) {
                pathCost += Math.sqrt(Math.pow(point[0] - previous[0], 2) + Math.pow(point[1] - previous[1], 2));
            }
            previous = point;
        }
        if (previous) {
            pathCost += Math.sqrt(Math.pow(previous[0] - position[0], 2) + Math.pow(previous[1] - position[1], 2));
        }
    
        const newQueueObj = {
            position,
            path,
            cost,
            pathCost,
        };
    
        // is this item already in the queue? If so, only add it again if our current path
        // is shorter than the one already in queue
        if (this.processed[key] !== undefined && this.processed[key] !== null) {
            // find our path in the queue
            const index = this.queue.findIndex((a) => {
                return a.position[0] === position[0] && a.position[1] === position[1];
            });
            // if the item has already been processed, then it was probably cheaper
            // than our path and we can just skip. Otherwise, we can compare
            if (index >= 0) {
                const cost = Los.getPathCost(path);
                const otherCost = Los.getPathCost(this.queue[index].path);
    
                if (cost < otherCost) {
                    this.queue[index] = newQueueObj;
                }
            }
            return;
        }
    
        //console.log(path);
    
        //const cost = getPathCost([...path, position]);
        // distance to the end
    
        //console.log('hanlding', position);
    
        let inserted = false;
        for (let i=0;i<this.queue.length;i++) {
            if (this.queue[i].pathCost >= pathCost) {
                this.queue.splice(i, 0, newQueueObj);
                inserted = true;
                break;
            }
        }
    
        if (!inserted) {
            this.queue.push(newQueueObj);
        }
        this.processed[Los.keyPoint(position)] = true;
    }

    getQueue() {
        return this.queue;
    }

    processQueue() {
        if (this.queue.length === 0) {
            return;
        }
    
        const queueItem = this.queue.shift();
    
        let pointsForPosition = this.getPointsFromPosition(queueItem.position);
            pointsForPosition = pointsForPosition.filter((point) => {
            for (const item of queueItem.path) {
                if (item[0] === point[0] && item[1] === point[1]) {
                    //console.log('matcing');
                    return false;
                }
            }
    
            return true;
        });
    
        this.position = queueItem.position;
        path = queueItem.path;
    
        //console.log('procesing queue got points', points.length);
        for (const point of pointsForPosition) {
            // is this point a point that can see the end?
            const key = Los.keyPoint(point);
            if (this.endPoints[key]) {
                this.setValidPath([...path, queueItem.position, ...this.endPoints[key]]);
                continue;
            }
    
            //console.log('checking', point);
            this.addToQueue(point, [...path, queueItem.position]);
        }
        //console.log('when done', queue.length, processed.length);
    }

    getCurrentPosition() {
        return this.position;
    }
}