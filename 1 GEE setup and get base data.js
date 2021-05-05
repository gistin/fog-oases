//This is the main setup for the modis data and various clipping to define only lomas
//It very slow
//edits to lomas_clip is useful for minor updates and additions.
//22/04/2020 & 07/05/2020
//updated 16/07/2020
//further south and Oli's minor areas also added layer for very ethermal areas 1-7 days of above (these are areas which may have only reactive once in 20 years)
//minor edit from Maria 26/03/2021


//set up
//Map.setCenter(-75.75, -14.75, 10);
Map.setOptions("TERRAIN");
/////////////
//Coastline//
/////////////
var buffdis = 50000;//seems to work well

//buffer function 
var getBuffer = function(feature){
  var buffer = feature.buffer(buffdis);
  return ee.Feature(buffer);
};

var buffers = Coastline.map(getBuffer);
//convert to raster
var empty = ee.Image().byte();
var buffi = empty.paint({
  featureCollection: buffers,
  color: 1,
});
var buffi = buffi.eq(1);

//////////////
//Elevation//
/////////////
var dataset = ee.Image('CGIAR/SRTM90_V4');
var elevation = dataset.select('elevation');
var binele = elevation.lt(1800).and(elevation.gt(25));

///////////
//Aridity// 
//////////
var binarid = aridity.lt(1259);

//////////////////
//Hand digitised//
//////////////////
var emptyl = ee.Image().byte();
var fc = ee.FeatureCollection(lomas_clip);
print(fc);

var fc_l = fc.union();

var lclip = emptyl.paint({
  featureCollection: fc_l,
  color: 1,
});
var lclip = lclip.eq(1);


//bring together
var maskl = binele.multiply(binarid.multiply(buffi.multiply(lclip)));
var maskl = maskl.select('elevation').eq(1);

//////////////////////////////
//build the NDVI modis image//
//////////////////////////////
//1000-1500 @ 1000 mystry tillsandia starts to pop out, but we also get some coastal stuff from San fernado coming as well
// most likely to cacti  zone we looked at once before.
//NB this is presently pulling until end of 2020 (for paper), removed date filter for upto date analysis
var modisndvi = ee.ImageCollection('MODIS/006/MOD13Q1').select('NDVI').filterDate('2000-01-01', '2020-12-07');
var theshold = function(image,thesholdval){
  return image.gt(thesholdv);
};
//run for the higher threshold
var thesholdv = 1500;
var thesholdedndvicol = modisndvi.map(theshold);
var countndvi  = thesholdedndvicol.sum();
//run for the lower threshold
var thesholdv = 1000;
var thesholdedndvicol = modisndvi.map(theshold);
var countndvil  = thesholdedndvicol.sum();

//calculate days, weeks and months for cateogories etc
var ndays = modisndvi.size().getInfo();
var amonth = ndays/12;
var aweek = ndays/52.1429;
var aday = ndays/365.25;

//var lomasbi = countndvil.gt(1).add(countndvil.gt(aweek)).add(countndvi.gt(aweek)).add(countndvi.gt(aweek * 2)).add(countndvi.gt(amonth)).add(countndvi.gt(amonth * 3)).add(countndvi.gt(amonth * 6)); 
var lomasbi = countndvil.gt(aweek).add(countndvi.gt(aweek)).add(countndvi.gt(aweek * 2)).add(countndvi.gt(amonth)).add(countndvi.gt(amonth * 3)).add(countndvi.gt(amonth * 6)); 
//old colours for reference (better for printing)
/*var weekspallet = [
  'c1b291', //1 week of weak veg
  'e9ffb3', //1 week of higher veg
  'c7e9c0', //2 weeks
  '78c679', //1 month
  '94f700', //3 months
  '267300']; //6 months
*/  
var weekspallet = [
//  '94918b', //less than one week
  'c1b291', //1 week of weak veg
  'e68e1c', //1 week of higher veg
  'f7df07', //2 weeks
  '7bed00', //1 month
  '0ec441', //3 months
  '1e9094']; //6 months
  

//update mask for all
var lomasbimask = lomasbi.updateMask(maskl.multiply(lomasbi.gt(0.1)));

//////////////
//view data //
//////////////

//add orginal NDVI layer for reference (behind grey)
Map.addLayer(lomasbi.updateMask(lomasbi).clip(AOI),{min: 1, max: 6, palette:weekspallet},"NDVI background");


//build layer to darken background
//build layer to darken background
var empty = ee.Image(1).byte();
Map.addLayer(empty.clip(AOI),{opacity:0.57},"empty");



Map.addLayer(lomasbimask.clip(AOI),{min: 1, max: 6, palette:weekspallet},"Lomas");
//Map.addLayer(Lomas_clip,{},"editme?");




/////////////////////////////
//add legend////////////////
///////////////////////////
// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Lomas time in flush',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
// name of the legend
var names = ['Ephemeral (weak)','1 Week','2 Weeks','1 Month', '3 Months','6 Months'];
 
// Add color and and names
for (var i = 0; i < 6; i++) {
  legend.add(makeRow(weekspallet[i], names[i]));
  }  
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);
///////////////////
//export to asset//
///////////////////


//export image to asset to be used in later analysis

Export.image.toAsset({
  image:lomasbimask,
  description:'Lomas_class_map_2021',
  assetId:'fog_oasis/fo_class2021',
  scale:250,
  region:AOI
});



Export.image.toAsset({
  image:lomasbi,
  description:'SA_class_map',
  assetId:'fog_oasis/background_class',
  scale:250,
  region:AOI
});

///////////////////////////////////
//export to for external analysis//
//////////////////////////////////


//Export AOI for laterwork
//Export.table.toAsset({
//  collection: AOI,
//  description:'AOI_vector',
//  assetId: 'Lomas_AOI',
//  });

//Export clips polygons
//Export.table.toDrive({
//  collection: fc_l,
//  description:'lomas_vector',
//  fileFormat: 'SHP'
//  });

// Export the image, specifying scale and region.

Export.image.toDrive({
  image: lomasbimask,
  description: 'lomas_TIFF_04_2021',
  scale: 250,
  fileFormat: 'GeoTIFF',
  region:AOI
});

//export the background NDVI image


Export.image.toDrive({
  image: lomasbi,
  description: 'lomas_class_background_12_2020',
  scale: 250,
  fileFormat: 'GeoTIFF',
  region:AOI
});




