var map;

function initMap(){
  map = new google.maps.Map(document.getElementById('map') , {
    center : {lat: 32.0853, lng: 34.7818},
    zoom: 8
  });
};
