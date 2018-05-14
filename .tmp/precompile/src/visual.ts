/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

interface Window {
    d3: typeof d3;
    _: typeof _;
}

interface DataElement {
    name: string;
    actual: number;
    target: number;
}

module powerbi.extensibility.visual.d3CustomVisual6C69AB0B8C0043849557CC5C17A59169  {
    export class Visual implements IVisual {
        private target: HTMLElement;
        private settings: VisualSettings;

        // visual settings
        private d3: typeof d3;
        private _: typeof _;
        private root: d3.Selection<any, any, any, any>;
        private chartHeight: number;
        private chartWidth: number;
        private marginHeight: number;
        private marginWidth: number;
        private xAxis: any;
        private yAxis: any;
        private xScale: d3.ScaleLinear<any, any>;
        private yScale: d3.ScaleLinear<any, any>;
        private chart: any;
        private tooltip: any;
        private selectionIdBuilder: ISelectionIdBuilder;
        private selectionManager: ISelectionManager;
        private selectionIds: ISelectionId[];
        private constructorHost: IVisualHost;

        // visual data
        private nameData: string[];
        private actualData: number[];
        private targetData: number[];
        private dataBag: DataElement[];

        constructor(options: VisualConstructorOptions) {
            console.log('Visual constructor', options);

            // load and set basic visual settings
            this.d3 = window.d3;
            this._ = window._;
            this.marginHeight = 25;
            this.marginWidth = 50;
            this.selectionIdBuilder = options.host.createSelectionIdBuilder();
            this.selectionManager = options.host.createSelectionManager();
            this.constructorHost = options.host;

            // initial parse
            this.initialParse(options);

            this.xScale = this.d3.scaleLinear().range([this.marginWidth, this.chartWidth - this.marginWidth]);
            this.yScale = this.d3.scaleLinear().range([this.chartHeight - this.marginHeight, this.marginHeight]);
            this.xAxis = this.d3.axisBottom(this.xScale);
            this.yAxis = this.d3.axisLeft(this.yScale);

            // initial render visuals
            this.initialRender(options);
        }

        public update(options: VisualUpdateOptions) {
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            console.log('Visual update', options);

            // update parse
            this.updateParse(options);

            // re-render visuals
            this.updateRender(options);

            // generating selection ids
            let dataViews = options.dataViews; // options: VisualUpdateOptions
            let categorical = dataViews[0].categorical;
            let dataValues = categorical.values;

            this.selectionIds = this.dataBag.map((d, i) => {
                return this.constructorHost.createSelectionIdBuilder()
                    .withCategory(options.dataViews[0].categorical.categories[0], i)
                    .withMeasure(d.name)
                    .createSelectionId();
            });
        }

        private initialParse(options: VisualConstructorOptions) {
            // visual
            this.chartHeight = options.element.clientHeight;
            this.chartWidth = options.element.clientWidth;
        }

        private updateParse(options: VisualUpdateOptions) {
            // visual
            this.chartHeight = options.viewport.height;
            this.chartWidth = options.viewport.width;

            // name data
            if (this._.get(options, "dataViews[0].categorical.categories[0].source.displayName") === "Content.name") {
                this.nameData = options.dataViews[0].categorical.categories[0].values as string[];
            } else {
                this.nameData = undefined;
            }

            // actual data
            if (this._.get(options, "dataViews[0].categorical.values[0].source.displayName") === "Content.actualValue") {
                this.actualData = options.dataViews[0].categorical.values[0].values as number[];
            } else {
                this.actualData = undefined;
            }

            // target data
            if (this._.get(options, "dataViews[0].categorical.values[1].source.displayName") === "Content.targetValue") {
                this.targetData = options.dataViews[0].categorical.values[1].values as number[];
            } else if (this._.get(options, "dataViews[0].categorical.values[0].source.displayName") === "Content.targetValue") {
                // check if targetValue is at index 0 .. case when actualValue field is not provided
                this.targetData = options.dataViews[0].categorical.values[0].values as number[];
            } else {
                this.targetData = undefined;
            }

            this.xScale = this.d3.scaleLinear()
                .domain(this.calcDomain(this.targetData))
                .range([this.marginWidth, this.chartWidth - this.marginWidth]);
            this.yScale = this.d3.scaleLinear()
                .domain(this.calcDomain(this.actualData))
                .range([this.chartHeight - this.marginHeight, this.marginHeight]);
            this.xAxis = this.d3.axisBottom(this.xScale);
            this.yAxis = this.d3.axisLeft(this.yScale);

            this.dataBag = this.generateBag(this.nameData, this.actualData, this.targetData);
        }

        private initialRender(options: VisualConstructorOptions) {
            // svg element to create visual within
            this.root = this.d3
                .select(options.element)
                .append("svg")
                .attr("height", this.chartHeight)
                .attr("width", this.chartWidth)
                .append("g");

            // x axis
            this.root.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + (this.chartHeight - this.marginHeight) + ")")
                .call(this.xAxis);

            // y axis
            this.root.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (this.marginWidth) + ", 0)")
                .call(this.yAxis);

            // chart
            this.chart = this.root
                .append("g")
                .attr("class", "chart");
        }

        private updateRender(options) {
            this.d3.select("svg")
                .attr("height", this.chartHeight)
                .attr("width", this.chartWidth);

            this.root.selectAll(".x.axis")
                .attr("transform", "translate(0," + (this.chartHeight - this.marginHeight) + ")")
                .call(this.xAxis);

            this.root.selectAll(".y.axis")
                .attr("transform", "translate(" + (this.marginWidth) + ", 0)")
                .call(this.yAxis);

            this.chart.remove();
            this.chart = this.root
                .append("g")
                .attr("class", "chart");

            this.chart.selectAll(".point")
                .data(this.dataBag)
                .enter()
                .append("circle")
                .attr("class", "point")
                .style("fill", "steelblue")
                .attr("cx", d => this.xScale(d.target))
                .attr("cy", d => this.yScale(d.actual))
                .attr("r", 5)
                .on("mouseover", d => {
                    let tooltip = this.chart.select(".hoverTag." + d.name);
                    tooltip.style("opacity", .9);
                })
                .on("mouseout", d => {
                    let tooltip = this.chart.select(".hoverTag." + d.name);
                    tooltip.style("opacity", 0);
                })
                .on("click", (d, i) => {
                    this.selectionManager.select(this.selectionIds[i]).then((ids: ISelectionId[]) => {
                        console.log("SELECTED IDS:", ids);
                    });
                });

            this.chart.selectAll(".label")
                .data(this.dataBag)
                .enter()
                .append("text")
                .attr("class", "label")
                .attr("x", d => this.xScale(d.target) + 10)
                .attr("y", d => this.yScale(d.actual))
                .text(d => d.name);

            this.chart.selectAll(".hoverTag")
                .data(this.dataBag)
                .enter()
                .append("text")
                .attr("class", d => "hoverTag " + d.name)
                .style("opacity", 0)
                .attr("x", d => this.xScale(d.target) - 100)
                .attr("y", d => this.yScale(d.actual) - 20)
                .text(d => { return "Actual: " + d.actual + ", Target: " + d.target; });
        }

        private calcDomain(valueArr: number[]) {
            let domainArr = this.d3.extent(valueArr);
            let offset = domainArr[0] / 10;
            domainArr[0] = domainArr[0] - offset;
            domainArr[1] = domainArr[1] + offset;
            return domainArr;
        }

        private generateBag(nameArr: string[], actualArr: number[], targetArr: number[]) {
            let temp: DataElement[] = [];

            for (let i = 0; i < this.nameData.length; i++) {
                temp.push({
                    name: this.nameData[i],
                    actual: this.actualData[i],
                    target: this.targetData[i]
                });
            }

            return temp;
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /**
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
         * objects and properties you want to expose to the users in the property pane.
         *
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
    }
}