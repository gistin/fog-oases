//updated 11/12/2020

//Lomas_regionID

//setup simple map
//extracts charts of the mean NDVI from Lomas which is in green 2 weeks or more
//presently uses fc50km, but should work just as well with other 

//some references
//review
//https://gis.stackexchange.com/questions/333651/google-earth-engine-get-table-and-not-a-chart-of-time-series-multiple-polyg
//https://stackoverflow.com/questions/55484656/iterating-over-a-gee-featurecollection
//https://gis.stackexchange.com/questions/328118/subset-featurecollection-by-position-google-earth-engine 

//Setup
Map.setCenter(-75.75, -14.75, 10);
Map.setOptions("TERRAIN");
var weekspallet = [
  'c1b291', //1 week of weak veg
  'e68e1c', //1 week of higher veg
  'f7df07', //2 weeks
  '7bed00', //1 month
  '0ec441', //3 months
  '1e9094']; //6 months
//Add layers
  Map.addLayer(Lomas_class,{min: 1, max: 6, palette:weekspallet},"Lomas time in flush");
  Map.addLayer(names,{},"grouped names");


//modis dataset
var modis = ee.ImageCollection('MODIS/006/MOD13Q1');

//update this collection to mask only the pixels I want from Lomas_class
var mask1 = Lomas_class.gte(2);
//Map.addLayer(mask1,{},"mask");
//remapping QA to percentage contribution to the mean (remove 2 and 3, 1 only 50%)
//and apply mask
var rqa = function(image){
  var qa_remapped = image.select('SummaryQA').remap([0,1,2,3],[100,50,0,0]);
  var ndvi = image.select('NDVI').addBands(qa_remapped);
  return ndvi.updateMask(mask1);
};


var mmodis = modis.map(rqa);
Map.addLayer(mmodis,{},"mask");

// Use a mean reducer.
var reducer = ee.Reducer.mean();




//60 is i limit (probably best to get from group polys, but again it works)


//should be done with a map function,but can't get it to work
//whiching to a simple loop (not the best way to do it, but it works)
var i;

for (i = 1; i < 61; i++) {
  var poly = names.filter(ee.Filter.eq('ID', i));
  chart(poly,mmodis,i.toString(10));
}
function chart(region_v, icol,name) {
      var chart_ndvi = ui.Chart.image.series({
      imageCollection: icol,
      region: region_v,
      reducer: reducer.splitWeights(),
      scale: 250
    }).setOptions({title: name.concat(' Polygon ID')});
    print(chart_ndvi);
    return(chart_ndvi);
}


