class Los {
    constructor(width, height, start, end, walls, overridePoints = null) {
        this.width = width;
        this.height = height;
        this.start = start;
        this.end = end;
        this.walls = walls;
        this.overridePoints = overridePoints;
        this.endPoints = {};
        this.preComputedPoints = {};
        this.allPoints = null;
    }

    static keyPoint(point) {
        return `${point[0]},${point[1]}`;
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
    
        preComputedPoints[key] = points;
    
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
                if (dist < maxDistToLine) {
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
}