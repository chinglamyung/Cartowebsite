 // hide the form if the browser doesn't do SVG,
 // (then just let everything else fail)
 if (!document.createElementNS) {
     document.getElementsByTagName("form")[0].style.display = "none";
 }

 var year_timer = false,
     carto_timer = false,
     idx = 0,
     field_selected = 0;

 function year_iter() {
     if (year_timer) {
         clearTimeout(year_timer);
         year_timer = false;
         document.getElementById("year_button").value = "year_iteration";

     } else {
         year_timer = setInterval(year_iteration, 500);
         document.getElementById("year_button").value = "Stop";
     }
 }

 function year_iteration() {
     year = years[idx];
     location.hash = "#" + [field.id, year].join("/");
     parseHash();
     idx += 1;
     if (idx == years.length) {
         idx = 0;
     }
 }

 function carto_animation() {
     if (carto_timer) {
         clearTimeout(carto_timer);
         carto_timer = false;
         document.getElementById("animation_button").value = "cartogram animation";
     } else {
         field_selected = document.getElementById("field").selectedIndex
         carto_timer = setInterval(carto_animation_iteration, 800);
         document.getElementById("animation_button").value = "Stop";
     }
 }

 function carto_animation_iteration() {
     if (document.getElementById("field").selectedIndex == 0) {
         field = fields[field_selected];
     } else {
         field = fields[0];
     }

     console.log(field_selected);
     location.hash = "#" + [field.id, year].join("/");
     parseHash();
 }
 // field definitions from:
 // <http://www.census.gov/popest/data/national/totals/2011/files/NST-EST2011-alldata.pdf>
 var percent = (function() {
         var fmt = d3.format(".2f");
         return function(n) { return fmt(n) + "%"; };
     })(),

     usa = [ //this data get into dropdown list.
         { name: "(no scale)", id: "none" },
         // {name: "Census Population", id: "censuspop", key: "CENSUS%dPOP", years: [2010]},
         // {name: "Estimate Base", id: "censuspop", key: "ESTIMATESBASE%d", years: [2010]},
         { name: "Population Estimate", id: "popest", key: "POPESTIMATE%d" },
         { name: "Population Change", id: "popchange", key: "NPOPCHG_%d", format: "+," },
         { name: "Births", id: "births", key: "BIRTHS%d" },
         { name: "Deaths", id: "deaths", key: "DEATHS%d" },
         { name: "Natural Increase", id: "natinc", key: "NATURALINC%d", format: "+," },
         { name: "Int'l Migration", id: "intlmig", key: "INTERNATIONALMIG%d", format: "+," },
         { name: "Domestic Migration", id: "domesticmig", key: "DOMESTICMIG%d", format: "+," },
         { name: "Net Migration", id: "netmig", key: "NETMIG%d", format: "+," },
         { name: "Residual", id: "residual", key: "RESIDUAL%d", format: "+," },
         { name: "Birth Rate", id: "birthrate", key: "RBIRTH%d", years: [2011], format: percent },
         { name: "Death Rate", id: "deathrate", key: "RDEATH%d", years: [2011], format: percent },
         { name: "Natural Increase Rate", id: "natincrate", key: "RNATURALINC%d", years: [2011], format: percent },
         { name: "Int'l Migration Rate", id: "intlmigrate", key: "RINTERNATIONALMIG%d", years: [2011], format: percent },
         { name: "Net Domestic Migration Rate", id: "domesticmigrate", key: "RDOMESTICMIG%d", years: [2011], format: percent },
         { name: "Net Migration Rate", id: "netmigrate", key: "RNETMIG%d", years: [2011], format: percent },
     ],
     korea = [
         { name: "(no scale)", id: "none" },
         { name: "Population Estimate", id: "popest", key: "POP%d" }
     ],

     fields_list = [
         usa,
         korea
     ],
     countries = [
         { name: "the USA", id: "usa" },
         { name: "Republic of Korea", id: "s_korea" }
     ],
     years_usa = [2010, 2011],
     years_korea = [2012, 2013, 2014, 2015, 2016],
     years_list = [years_usa, years_korea],
     years = years_list[0],
     fields = fields_list[0],
     fieldsById = d3.nest()
     .key(function(d) { return d.id; })
     .rollup(function(d) { return d[0]; })
     .map(fields),
     country = countries[0],
     field = fields[0],
     year = years[0],
     colors = colorbrewer.RdYlBu[3]
     .reverse()
     .map(function(rgb) { return d3.hsl(rgb); });

 var body = d3.select("body"),
     stat = d3.select("#status");

 //initial setting on country
 var CountrySelect = d3.select("#country")
     .on("change", function(e) {
         fields = fields_list[this.selectedIndex];
         years = years_list[this.selectedIndex];
         field = fields[0];
         location.hash = "#" + [field.id, year].join("/");
     });

 var fieldSelect = d3.select("#field")
     .on("change", function(e) {
         field = fields[this.selectedIndex];
         location.hash = "#" + [field.id, year].join("/");
     });

 //when you change field
 fieldSelect.selectAll("option")
     .data(fields)
     .enter()
     .append("option")
     .attr("value", function(d) { return d.id; })
     .text(function(d) { return d.name; });

 var yearSelect = d3.select("#year")
     .on("change", function(e) {
         year = years[this.selectedIndex];
         location.hash = "#" + [field.id, year].join("/");
     });

 yearSelect.selectAll("option")
     .data(years)
     .enter()
     .append("option")
     .attr("value", function(y) { return y; })
     .text(function(y) { return y; })

 var map = d3.select("#map"),
     zoom = d3.behavior.zoom()
     .translate([-38, 32])
     .scale(.94)
     .scaleExtent([0.5, 10.0])
     .on("zoom", updateZoom),
     layer = map.append("g")
     .attr("id", "layer"),
     states = layer.append("g")
     .attr("id", "states")
     .selectAll("path");

 // map.call(zoom);
 updateZoom();

 function updateZoom() {
     var scale = zoom.scale();
     layer.attr("transform",
         "translate(" + zoom.translate() + ") " +
         "scale(" + [scale, scale] + ")");
 }

 var proj = d3.geo.albersUsa(), //set projection of cartogram, topojson
     topology,
     geometries,
     rawData,
     dataById = {},
     carto = d3.cartogram() //cartogram starts.
     .projection(proj)
     .properties(function(d) {
         return dataById[d.id];
     })
     .value(function(d) {
         return +d.properties[field];
     });


 //when hash changes
 window.onhashchange = function() {
     parseHash();
 };

 var url = "data/us-states.topojson"; //usually use "data/us-states.topojson" (we don't need segmentized)

 //url ="https://d3js.org/us-10m.v1.json";
 function make_json() {
     d3.json(url, function(topo) { //take topo json file
         topology = topo;
         geometries = topology.objects.states.geometries;

         d3.csv("data/nst_2011.csv", function(data) { //take csv file.
             rawData = data;
             dataById = d3.nest()
                 .key(function(d) { return d.NAME; })
                 .rollup(function(d) { return d[0]; })
                 .map(data);
             init();
         });
     });
 }

 make_json();

 function init() {

     var features = carto.features(topology, geometries),
         path = d3.geo.path()
         .projection(proj);

     states = states.data(features)
         .enter()
         .append("path")
         .attr("class", "state")
         .attr("id", function(d) {
             return d.properties.NAME;
         })
         .attr("fill", "#fafafa")
         .attr("d", path);

     states.append("title");

     parseHash();
 }

 function reset() {
     stat.text("");
     body.classed("updating", false);

     var features = carto.features(topology, geometries),
         path = d3.geo.path()
         .projection(proj);

     states.data(features)
         .transition()
         .duration(750)
         .ease("linear")
         .attr("fill", "#fafafa")
         .attr("d", path);

     states.select("title")
         .text(function(d) {
             return d.properties.NAME;
         });
 }

 function update() {
     var start = Date.now();
     body.classed("updating", true);

     var key = field.key.replace("%d", year),
         fmt = (typeof field.format === "function") ?
         field.format :
         d3.format(field.format || ","),
         value = function(d) {
             return +d.properties[key];
         },
         values = states.data()
         .map(value)
         .filter(function(n) {
             return !isNaN(n);
         })
         .sort(d3.ascending),
         lo = values[0],
         hi = values[values.length - 1];

     var color = d3.scale.linear()
         .range(colors)
         .domain(lo < 0 ? [lo, 0, hi] : [lo, d3.mean(values), hi]);

     // normalize the scale to positive numbers
     var scale = d3.scale.linear()
         .domain([lo, hi])
         .range([1, 1000]);

     // tell the cartogram to use the scaled values
     carto.value(function(d) {
         return scale(value(d));
     });

     // generate the new features, pre-projected
     var features = carto(topology, geometries).features;

     // update the data
     states.data(features)
         .select("title")
         .text(function(d) {
             return [d.properties.NAME, fmt(value(d))].join(": ");
         });

     states.transition()
         .duration(750)
         .ease("linear")
         .attr("fill", function(d) {
             return color(value(d));
         })
         .attr("d", carto.path);

     var delta = (Date.now() - start) / 1000;
     stat.text(["calculated in", delta.toFixed(1), "seconds"].join(" "));
     body.classed("updating", false);
 }

 var deferredUpdate = (function() {
     var timeout;
     return function() {
         var args = arguments;
         clearTimeout(timeout);
         stat.text("calculating...");
         return timeout = setTimeout(function() {
             update.apply(null, arguments);
         }, 10);
     };
 })();

 var hashish = d3.selectAll("a.hashish")
     .datum(function() {
         return this.href;
     });

 function parseHash() {
     var parts = location.hash.substr(1).split("/"),
         desiredFieldId = parts[0],
         desiredYear = +parts[1];

     field = fieldsById[desiredFieldId] || fields[0];
     year = (years.indexOf(desiredYear) > -1) ? desiredYear : years[0];

     fieldSelect.property("selectedIndex", fields.indexOf(field));

     if (field.id === "none") {

         yearSelect.attr("disabled", "disabled");
         reset();

     } else {

         if (field.years) {
             if (field.years.indexOf(year) === -1) {
                 year = field.years[0];
             }
             yearSelect.selectAll("option")
                 .attr("disabled", function(y) {
                     return (field.years.indexOf(y) === -1) ? "disabled" : null;
                 });
         } else {
             yearSelect.selectAll("option")
                 .attr("disabled", null);
         }

         yearSelect
             .property("selectedIndex", years.indexOf(year))
             .attr("disabled", null);

         deferredUpdate();
         location.replace("#" + [field.id, year].join("/"));

         hashish.attr("href", function(href) {
             return href + location.hash;
         });
     }
 }