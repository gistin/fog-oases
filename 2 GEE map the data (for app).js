///////////////////////////////////
//draw resultant maps and locations
///////////////////////////////////

//either 
//https://gistin.users.earthengine.app/view/fogoasis or
//https://gistin.users.earthengine.app/view/fogoasis#regionid=? to highlight a region
//https://gistin.users.earthengine.app/view/fogoasis#llz=lat?,long?,zoomlevel? zone to a point (lat,long, zoom level)
//https://gistin.users.earthengine.app/view/fogoasis#llz=-16.2474,-73.4435,11 zone to a point (lat,long, zoom level) 


//set up map

//Map.centerObject(Lomas_regions, 7);

//Map.setCenter(-75.75, -14.75, 6);
Map.setOptions("TERRAIN");
Map.style().set('cursor', 'crosshair');

//get # entries

var regionid = ui.url.get('regionid',0);
var llz = ui.url.get('llz',0);

print(regionid);
print(llz);

//if region and lat long 0 then choose random region to highligh
//if not then zoom into region or lat long, z
if (regionid === 0){
  if (llz === 0){
  regionid = Math.floor(Math.random() * 59) + 1;
  var focusregion = Lomas_regions.filter(ee.Filter.eq('Id',regionid));
  Map.centerObject(focusregion, 8);
  } else {
  var llc =  llz.split(",");
  Map.setCenter(Number(llc[1]),Number(llc[0]), Number(llc[2]));
  var thepoint = ee.Geometry.Point([Number(llc[1]), Number(llc[0])]);
  var focusregion = Lomas_regions.filterBounds(thepoint);
  }
} else {
  var focusregion = Lomas_regions.filter(ee.Filter.eq('Id',regionid));
  Map.centerObject(focusregion, 8);
}

//Build the regions





  var otherregions = Lomas_regions.filter(ee.Filter.eq('Class','Fog Oasis'));
  var otherregions = otherregions.filter(ee.Filter.neq('Id',regionid));
var transit = Lomas_regions.filter(ee.Filter.eq('Class','Transitional'));
var transit = transit.filter(ee.Filter.neq('Id',regionid));


//set map up 





var empty = ee.Image().byte();
var regionsbackground =  empty.paint({
  featureCollection: focusregion,
  color: 1, 
  width: 4
}).paint({
  featureCollection: transit,
  color: 2, 
  width: 2
}).paint({
   featureCollection: otherregions,
  color: 3, 
  width: 2 
});
var txt = "Highlighed region: ".concat(regionid);



//build fog oasis raster

var weekspallet = [
  'c1b291', //1 week of weak veg
  'e68e1c', //1 week of higher veg
  'f7df07', //2 weeks
  '7bed00', //1 month
  '0ec441', //3 months
  '1e9094']; //6 months
  
  
var legpallet = [
  'c1b291', //1 week of weak veg
  'e68e1c', //1 week of higher veg
  'f7df07', //2 weeks
  '7bed00', //1 month
  '0ec441', //3 months
  '1e9094',//6 months
  'FFFFFF', //emply cell
  'A900E4']; //tillandsia

var darkpallet = [
  '2F2B23',
  '382207',
  '3C3600',
  '1E3900',
  '022F10',
  '072324'
  ] ;


//add locations
var locs = ee.FeatureCollection(FO_locs);



//add layers
//build layer to darken background
Map.addLayer(SA_class.updateMask (SA_class.gt(0.1)),{opacity:0.75,min: 1, max: 6, palette:darkpallet},"Background NDVI");
 


//var empty = ee.Image(1).byte();
//Map.addLayer(empty,{opacity:0.65},"Grey background");
Map.addLayer(Lomas_class,{min: 1, max: 6, palette:weekspallet},"Verdant fog oasis");
Map.addLayer(till, {opacity:0.50,min:0, max:1,palette: ['A900E4','A900E4','A900E4']},'Tillandsia fog oasis');
Map.addLayer(regionsbackground, {min:1, max:3,palette: ['ffa200','222222','ff0000']}, txt);
Map.addLayer(locs, {color: '000000'}, 'Locations');



// Side bar and query of names set up
// Create an empty panel in which to arrange widgets.
// The layout is vertical flow by default.
var title = ui.Label('Click on a locality for more information. ###[be patience a lot of data is being processed]');
    title.style().set('fontWeight', 'bold');
var panel = ui.Panel({style: {width: '300px'}})
    .add(title);


// Set a callback function for when the user clicks the map.
Map.onClick(function(coords) {
  // Create or update the location label (the second widget in the panel)
  var location = 'lon: ' + coords.lon.toFixed(2) + ' ' +
                 'lat: ' + coords.lat.toFixed(2);


  var point = ee.Geometry.Point(coords.lon, coords.lat);
  //buffer by 5 pixels
  var buffdist = Map.getScale() * 5;
  var bpoint = point.buffer(buffdist);
  var filtered = locs.filterBounds(bpoint).first();
  var rfiltered = Lomas_regions.filterBounds(bpoint).first();
  //set variables
  var name = "Fog oasis site name: ";
  var group = "Fog oasis region ID: ";
  var groupnam = "Fog oasis Region Name: ";
  var latlong ="Lat, Long: ";


  
  //print(rfiltered.get("Id").getInfo());
  
  
  //build text on clicked point
  if   (filtered.getInfo() === null){
    if (rfiltered.getInfo() === null){
      group = group + "NULL";
      groupnam = groupnam +"NULL";
    } else {
      group = group + rfiltered.get("Id").getInfo();
      groupnam = groupnam + rfiltered.get("Nom").getInfo();
    }
    name = name + 'NULL';
    latlong = latlong + 'NULL';
  } else {
    name = name + filtered.get("Nom_Loma").getInfo();
    var lat = filtered.get("Latitud").getInfo();
    var long = filtered.get("Longitud").getInfo();
    latlong = latlong + lat + ", " + long;
    if (rfiltered.getInfo() === null){
      group = group + "NULL";
      groupnam = groupnam +"NULL";
    } else {
    group = group + rfiltered.get("Id").getInfo();
    groupnam = groupnam + rfiltered.get("Nom").getInfo();
    //and so on
    }
  }
 //add text
    panel.widgets().set(1, ui.Label(group));
    panel.widgets().set(2, ui.Label(groupnam));
    panel.widgets().set(3, ui.Label(name));
    panel.widgets().set(4, ui.Label(latlong));
});

// Add the panel to the ui.root.
ui.root.add(panel);

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
  value: 'Verdant Fog Oasis (av. flush)',
  style: {
    fontWeight: 'bold',
    fontSize: '16px',
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
var names = ['<2% (< 1 week - Ephemeral)','2% (<1 week)','2-4% (1-2 weeks)','4-8% (2-4 weeks)', '8-25% (1-3 months)','>50% (>6 months)',' ','Tillandsia fog oasis'];
 
// Add color and and names
for (var i = 0; i < 8; i++) {
  legend.add(makeRow(legpallet[i], names[i]));
  } 
  legend.add;
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);
    