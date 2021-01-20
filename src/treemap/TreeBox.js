import Color from "color";


export default class TreeBox {
    eRoot;
    eSelected;
    ePendingSelected = null;
    element;
    ctx;
    viewport = {x0: 0, x1: 0, y0: 0, y1: 0,};
    pixelRatio = 1;

    constructor({data, element, eventHandler, pixelRatio = 1}) {
        this.eventHandler = eventHandler;
        this.element = element;
        this.pixelRatio = pixelRatio;
        this.element.style.zoom = 1 / this.pixelRatio;
        this.eRoot = {
            children: data,
            x0: 0,
            y0: 0,
            x1: this.element.clientWidth,
            y1: this.element.clientHeight,
        };
        this.eSelected = this.eRoot;
        this.ctx = this.element.getContext("2d");


        this.viewport.x0 = 0;
        this.viewport.x1 = this.element.clientWidth;
        this.viewport.y0 = 0;
        this.viewport.y1 = this.element.clientHeight;
        this.layoutLayer(this.eSelected.children, {
            ctx: this.ctx,
            x0: 0,
            y0: 0,
            x1: this.element.clientWidth,
            y1: this.element.clientHeight,
            depth: 0,
        });

        this.updateLayerFontSize(this.eSelected.children);
        this.paintLayer(this.eSelected.children, {hovering: false, depth: 0});
        this.addEventListeners();
    }


    onMouseMoveEventListener = e => {
        this.onMouseMove(e.layerX, e.layerY);
        this.lastMousePos = {x: e.layerX, y: e.layerY}
    };

    onClickEventListener = e => {
        if (this.animating) {
            return;
        }
        if (this.ePendingSelected) {
            return;
        }
        if (!this.eSelected.children) {
            return;
        }
        if (this.lastHoveringItem && (!this.lastHoveringItem.parent || this.lastHoveringItem.parent.children.length > 1)) {
            this.lastHoveringItem.parent = this.eSelected;
            this.ePendingSelected = this.lastHoveringItem;
            this.animateViewPort(this.lastHoveringItem, {}).then(() => {
                this.eSelected = this.lastHoveringItem;
                this.ePendingSelected = null;
                this.lastHoveringItem = null;
                this.repaint();
                setTimeout(() => {
                    this.onMouseMove(
                        this.lastMousePos.x, this.lastMousePos.y
                    );
                });
            });
        }
    }

    addEventListeners() {
        this.element.addEventListener("mousemove", this.onMouseMoveEventListener)
        this.element.addEventListener("click", this.onClickEventListener);
    }

    removeEventListeners() {
        this.element.removeEventListener("mousemove", this.onMouseMoveEventListener)
        this.element.removeEventListener("click", this.onClickEventListener);
    }

    destroy() {
        this.removeEventListeners();
        this.clearRect(0, 0, this.element.clientWidth, this.element.clientHeight);

    }

    onMouseMove(layerx, layery) {
        let _x = layerx * this.pixelRatio;
        let _y = layery * this.pixelRatio;
        const transformed = this.reverseViewportTransform({x0: _x, y0: _y, x1: _x, y1: _y,});
        const x = transformed.x0;
        const y = transformed.y0;
        for (const e of (this.eSelected.children || [])) {
            if (e.x0 < x && e.x1 > x && e.y0 < y && e.y1 > y) {
                if (!(this.lastHoveringItem && this.lastHoveringItem === e)) {
                    if (this.lastHoveringItem) {
                        this.clearRectAndPaintLayer(this.lastHoveringItem, {hovering: false, depth: 0});
                    }
                    this.lastHoveringItem = e;
                    this.clearRectAndPaintLayer(e, {hovering: true, depth: 0});
                    this.emitEvent("hover", e);
                    break;
                }
            }
        }
    }

    clearAll() {
        this.clearRect(0, 0, this.element.clientWidth, this.element.clientHeight)
    }

    layoutLayer(data, {ctx, x0, x1, y0, y1, depth}) {
        for (let item of data) {
            if (!item.weight) {
                item.weight = this.calculateWeight(item);
            }
        }

        if (data.length === 1) {
            const item = data[0];
            item.x0 = x0;
            item.x1 = x1;
            item.y0 = y0;
            item.y1 = y1;
            item.layoutOk = true;

            if (item.children) {
                this.layoutLayer(item.children, {
                    ctx,
                    x0: x0,
                    x1: x1,
                    y0: y0,
                    y1: y1,
                    depth: depth + 1
                });
            }
            return;
        }
        const [group1, group2] = this.divideIntoTwoGroups(data);

        const width = x1 - x0;
        const height = y1 - y0;

        if (width > height) {
            //left-right
            const width = x1 - x0;
            const g1width = Math.round(width * this.calcTotalWeight(group1) / this.calcTotalWeight(data));
            this.layoutLayer(group1, {ctx, x0, x1: x0 + g1width, y0, y1, depth});
            this.layoutLayer(group2, {ctx, x0: x0 + g1width, x1, y0, y1, depth});
        } else {
            //top-bottom
            const height = y1 - y0;
            const g1height = Math.round(height * this.calcTotalWeight(group1) / this.calcTotalWeight(data));
            this.layoutLayer(group1, {ctx, x0, x1, y0, y1: y0 + g1height, depth});
            this.layoutLayer(group2, {ctx, x0, x1, y0: y0 + g1height, y1, depth});
        }
    }

    divideIntoTwoGroups(data) {
        const targetWeightForGroup1 = this.calcTotalWeight(data) / 2;
        const group1 = [];
        const group2 = [];
        let currentWright = 0;
        const array = data.sort((x, y) => {
            return y.weight - x.weight;
        });
        for (let item of array) {
            if (currentWright < targetWeightForGroup1) {
                group1.push(item);
            } else {
                group2.push(item);
            }
            currentWright += item.weight;
        }
        if (group1.length === 0) {
            group1.push(group2.shift());
        } else if (group2.length === 0) {
            group2.push(group1.shift());
        }
        return [group1, group2];
    }

    calcTotalWeight(data) {
        let result = 0;
        for (let item of data) {
            result += item.weight;
        }
        return result;
    }

    calculateWeight(item) {
        if (item.weight) {
            return item.weight;
        }

        let w = 0;
        for (let child of item.children) {
            w += this.calculateWeight(child);
        }
        return w;
    }

    paintLayer(data, {hovering, animationProgress = 0, depth, animationDirection = 1}) {
        if (!data || depth > 2) {
            return;
        }

        const fillText = (text, bounds, fontSize, fillStyle = "white") => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(bounds.x0, bounds.y0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
            this.ctx.clip();

            this.ctx.font = fontSize + 'px sans-serif';
            this.ctx.fillStyle = fillStyle;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(text, (bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2);
            this.ctx.restore();
        }
        for (let item of data) {
            let bounds = this.viewportTransform({x0: item.x0, y0: item.y0, x1: item.x1, y1: item.y1});

            // let fontSize = 100;
            let fontSize = item.fontSize;
            const paintNormal = () => {
                this.fillRect(item.x0, item.y0, item.x1 - item.x0, item.y1 - item.y0, {
                    margin: 1,
                    color: item.color({hovering, ctx: this.ctx, animationProgress: 0, bounds})
                });
                if (depth <= 2) {
                    fillText(item.text, bounds, fontSize)
                }
            }

            if (item.children) {
                this.paintLayer(item.children, {hovering, animationProgress, animationDirection, depth: depth + 1});
                if (this.ePendingSelected === item) {
                    this.fillRect(item.x0, item.y0, item.x1 - item.x0, item.y1 - item.y0, {
                        margin: 1,
                        color: item.color({hovering, ctx: this.ctx, animationProgress, bounds})
                    });
                    if (depth <= 2) {
                        fillText(item.text, bounds, fontSize, Color("white").opaquer(-animationProgress))
                    }
                } else if (this.eSelected !== item) {
                    paintNormal();
                }
            } else {
                this.clearRect(item.x0, item.y0, item.x1 - item.x0, item.y1 - item.y0);
                paintNormal();
            }
        }
    }

    clearRectAndPaintLayer(e, p) {
        this.clearRect(e.x0, e.y0, e.x1 - e.x0, e.y1 - e.y0);
        this.paintLayer([e], p)
    }

    clearRect(x0, y0, w, h) {
        const x1 = x0 + w;
        const y1 = y0 + h;
        let transformed = this.viewportTransform({x0, y0, x1, y1});
        this.ctx.clearRect(transformed.x0, transformed.y0, transformed.x1 - transformed.x0, transformed.y1 - transformed.y0);
    }

    fillRect(x0, y0, w, h, {margin = 0, color}) {
        const x1 = x0 + w;
        const y1 = y0 + h;
        let transformed = this.viewportTransform({x0, y0, x1, y1});
        this.ctx.fillStyle = color;
        this.ctx.fillRect(transformed.x0 + margin, transformed.y0 + margin, transformed.x1 - transformed.x0 - margin * 2, transformed.y1 - transformed.y0 - margin * 2);
    }

    viewportTransform({x0, y0, x1, y1}) {
        const vpw = this.viewport.x1 - this.viewport.x0;
        const vph = this.viewport.y1 - this.viewport.y0;
        return ({
            x0: (x0 - this.viewport.x0) / vpw * this.element.clientWidth,
            x1: (x1 - this.viewport.x0) / vpw * this.element.clientWidth,
            y0: (y0 - this.viewport.y0) / vph * this.element.clientHeight,
            y1: (y1 - this.viewport.y0) / vph * this.element.clientHeight,
        });
    }

    reverseViewportTransform({x0, y0, x1, y1}) {
        const vpw = this.viewport.x1 - this.viewport.x0;
        const vph = this.viewport.y1 - this.viewport.y0;
        return ({
            x0: (x0 * vpw / this.element.clientWidth) + this.viewport.x0,
            x1: (x1 * vpw / this.element.clientWidth) + this.viewport.x1,
            y0: (y0 * vph / this.element.clientHeight) + this.viewport.y0,
            y1: (y1 * vph / this.element.clientHeight) + this.viewport.y1,
        });
    }

    calcViewportSequenceToNewViewport(target, prog) {
        const baseX0 = this.viewport.x0;
        const diffX0 = target.x0 - baseX0;
        const baseX1 = this.viewport.x1;
        const diffX1 = target.x1 - baseX1;
        const baseY0 = this.viewport.y0;
        const diffY0 = target.y0 - baseY0;
        const baseY1 = this.viewport.y1;
        const diffY1 = target.y1 - baseY1;
        return ({
            x0: baseX0 + diffX0 * prog,
            x1: baseX1 + diffX1 * prog,
            y0: baseY0 + diffY0 * prog,
            y1: baseY1 + diffY1 * prog,
        })
    }

    animating = false;

    animateViewPort(target, {animationDirection = 1}) {
        if (this.animating) {
            return Promise.reject("animation in progress");
        }
        this.animating = true;
        return new Promise(resolve => {
            const animationStart = +new Date();
            const animationLength = 300;

            let onAnimationFrame = () => {
                let progress = (+new Date() - animationStart) / animationLength;
                if (progress > 1) {
                    progress = 1;
                }
                Object.assign(this.viewport, this.calcViewportSequenceToNewViewport(target, progress));
                this.clearAll();
                this.paintLayer(this.eSelected.children, {
                    hovering: false,
                    animationProgress: progress,
                    depth: 0,
                    animationDirection
                });

                if (progress < 1) {
                    requestAnimationFrame(onAnimationFrame);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(onAnimationFrame);
        }).finally(() => {
            this.animating = false;
        })
    }

    zoomOut() {
        if (this.animating) {
            return;
        }
        if (!this.eSelected.parent) {
            return;
        }
        this.eSelected = this.eSelected.parent;
        this.ePendingSelected = null;
        this.animateViewPort(this.eSelected, {animationDirection: -1}).then(() => {
            this.ePendingSelected = null;
            this.lastHoveringItem = null;
            this.repaint();
            setTimeout(() => {
                this.onMouseMove(
                    this.lastMousePos.x, this.lastMousePos.y
                );
            });
        });
    }

    updateLayerFontSize(data, {depth = 0} = {depth: 0}) {
        if (!data) {
            return;
        }
        let totalWeight = 0;
        for (let item of data) {
            totalWeight += item.weight;
            if (item.children && depth <= 2) {
                this.updateLayerFontSize(item.children, {depth: depth + 1});
            }
        }
        for (let item of data) {
            item.fontSize = Math.round((200 * this.pixelRatio / (1 + depth)) * Math.sqrt(item.weight / totalWeight));
        }
    }

    repaint() {
        if (!this.eSelected.children) {
            this.updateLayerFontSize([this.eSelected], {depth: 0});
        } else {
            this.updateLayerFontSize(this.eSelected.children, {depth: 0});
        }
        this.clearRectAndPaintLayer(this.eSelected, {hovering: false, depth: -1});
    }

    emitEvent(type, args) {
        if (!this.eventHandler) {
            return;
        }

        this.eventHandler(type, args);
    }
}
