
let app = new PIXI.Application({ width: 400, height: 400 });
document.body.appendChild(app.view);
let cellImages = ["images/green.png", "images/red.png", "images/blue.png"];
let fieldSizeData = {
    cellSize: 130,
    cellsByX: 3,
    cellsByY: 3
}
let winAmount = 3;
let cellsArr = [];
let winCells = [];
let needGenerateNewCells = false;
let isEnabledToMove = false;
let firstClickedCell = null;

window.onload = function () {

    init();

    function init() {
        PIXI.loader
            .add(cellImages)
            .load(createCells);
    }

    class Cell extends PIXI.Sprite {
        constructor(_index, x, y, _onCreateEnd) {
            super();
            let imgName = cellImages[_index];

            this.sprite = new PIXI.Sprite(
                PIXI.loader.resources[imgName].texture
            );
            this.type = imgName;
            this.sprite.width = fieldSizeData.cellSize;
            this.sprite.height = fieldSizeData.cellSize;
            this.xCoord = x;
            this.yCoord = y;
            this.sprite.interactive = true;
            this.sprite.buttonMode = true;
            this.sprite.y = -100;
            this.sprite.x = this.xCoord * fieldSizeData.cellSize;
            let newY = this.yCoord * fieldSizeData.cellSize;
            app.stage.addChild(this.sprite);
            let params = {
                y: newY,
                x: this.sprite.x,
                callback: _onCreateEnd
            };
            this.sprite.select = function () {
                this.sprite.selected = true;
                this.sprite.tint = '0xAAAAAA';
            };
            move(this.sprite, params);
            this.sprite.on('pointerdown', handleCellClick.bind(this));
        }
        destroy() {
            this.sprite.destroy();
        }
    }

    function handleCellClick() {
        if (isEnabledToMove) {
            if (!firstClickedCell) {
                firstClickedCell = this;
                firstClickedCell.sprite.alpha = 0.7;
            } else {
                secondClikedCell = this;
                let neighbour = checkIfNeighbourShape.call(this, firstClickedCell);
                if (neighbour) {
                    isEnabledToMove = false;
                    swapCells(firstClickedCell, secondClikedCell);
                } else {
                    firstClickedCell.sprite.alpha = 1;
                    firstClickedCell = null;
                }
            }
        }

        function checkIfNeighbourShape(otherShape) {
            return (Math.abs(this.xCoord - otherShape.xCoord) === 1) && (this.yCoord === otherShape.yCoord) ||
                (Math.abs(this.yCoord - otherShape.yCoord) === 1 && this.xCoord === otherShape.xCoord);
        };

    }
    function swapCells(shape1, shape2, restore) {
        cellsArr[shape1.yCoord][shape1.xCoord] = shape2;
        cellsArr[shape2.yCoord][shape2.xCoord] = shape1;
        var x = shape1.sprite.x;
        var y = shape1.sprite.y;
        var xCoord = shape1.xCoord;
        var yCoord = shape1.yCoord;
        shape1.xCoord = shape2.xCoord;
        shape1.yCoord = shape2.yCoord;
        shape2.xCoord = xCoord;
        shape2.yCoord = yCoord;
        let params1 = {
            y: shape2.sprite.y,
            x: shape2.sprite.x
        };
        let params2 = {
            y: y,
            x: x,
            callback: () => { firstClickedCell = null },
            callbackEnd: checkWinLines
        };
        shape1.sprite.alpha = 1;
        move(shape1.sprite, params1);
        move(shape2.sprite, params2);
    }

    function checkWinLines(_checkOtherDerection) {
        let lastType;
        let winLine = [];
        if (cellsArr && cellsArr.length > 0) {
            for (let i = 0; i < cellsArr.length; i++) {
                for (let j = 0; j < cellsArr[i].length; j++) {
                    let cell;
                    if (_checkOtherDerection) {
                        cell = cellsArr[i][j];
                    } else {
                        cell = cellsArr[j][i];
                    }
                    if (!lastType || cell.type === lastType) {
                        winLine.push(cell);
                    }
                    lastType = cell.type;
                }
                if (winLine.length >= winAmount) {
                    winCells.push(...winLine);
                    winLine = [];
                    lastType = null;
                } else {
                    winLine = [];
                    lastType = null;
                }
            }
        }
        if (_checkOtherDerection) {
            if (winCells && winCells.length > 0) {
                for (let cell of winCells) {
                    cell.sprite.visible = 0;
                }
                removeLine();
            } else {
                isEnabledToMove = true;
                return;
            }
        } else {
            checkWinLines(true);
        }
    }

    async function removeLine() {
        if (winCells && winCells.length > 0) {
            let cell = winCells.shift();
            let callback = await new Promise(function (resolve, releject) {
                shiftToBottomShape(cell.yCoord, cell.xCoord, resolve);
            });
            cell = null;
            removeLine();
            needGenerateNewCells = true;
        } else {
            if (needGenerateNewCells) {
                generateNewCells(checkWinLines);
            }
        }

    }

    async function generateNewCells(_call) {
        if (cellsArr) {
            for (let i = (cellsArr.length - 1); i >= 0; i--) {
                for (let j = 0; j < cellsArr[i].length; j++) {
                    if (!cellsArr[i][j]) {
                        await new Promise(function (resolve, releject) {
                            cellsArr[i][j] = createCell(j, i, resolve);
                        });
                    }
                }
                if (i === 0) {
                    needGenerateNewCells = false;
                    _call && _call();
                }
            }
        }

    }

    async function shiftToBottomShape(y, x, _call) {
        if (y > 0 && checkIfNeedShift(y, x)) {
            let cell = cellsArr[y - 1][x].sprite;
            let newPosY = cell.y + fieldSizeData.cellSize;
            let newPosX = cell.x;
            let params = {
                y: newPosY,
                x: newPosX,
                callback: shiftToBottomShape.bind(this, y - 1, x, _call),
                callbackEnd: onMoveComplete
            };
            move(cell, params);

            function onMoveComplete() {
                if (cellsArr[y][x]) {
                    cellsArr[y][x].destroy();
                    console.log("shift done");
                }
                cellsArr[y - 1][x].yCoord++;
                cellsArr[y][x] = cellsArr[y - 1][x];
                cellsArr[y - 1][x] = null;

            }
        } else {
            cellsArr[y][x] && cellsArr[y][x].destroy();
            cellsArr[y][x] = null;
            _call && _call(true);
        }

        function checkIfNeedShift(y, x) {
            if (cellsArr[y - 1] && cellsArr[y - 1][x]) {
                return true;
            } else if (cellsArr[y][x]) {
                return false;
            }
        }
    }



    function move(_sprite, _params) {
        var tween = gsap.to(_sprite, {
            duration: 0.3,
            y: _params.y,
            x: _params.x,
            ease: "none",
            onStart: () => {
            },
            onComplete: () => {
                if (!_sprite) {
                    console.log("no way2");
                }
                _sprite.y = _params.y;
                _sprite.x = _params.x;
                _params.callbackEnd && _params.callbackEnd();
                _params.callback && _params.callback();
                tween.kill();
            }
        });
    }

    async function createCells() {
        let prom = await new Promise((resolve, reject) => {
            for (let i = 0; i < fieldSizeData.cellsByX; i++) {
                let row = [];
                for (let j = 0; j < fieldSizeData.cellsByY; j++) {
                    let newCell = createCell(j, i, resolve);
                    row.push(newCell);
                }
                cellsArr.push(row);
            }
        });
        checkWinLines();
    }

    function createCell(x, y, _callback) {
        let index = getRandomInt(cellImages.length);
        let cell = new Cell(index, x, y, _callback);
        return cell;
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }


}



