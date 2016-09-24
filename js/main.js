var markerData = [
  {
    title:'blue bus',
    position: {lat: 32.480551, lng: 34.968628}
  },
  {
    title: 'yosko',
    position: {lat: 32.574282, lng: 34.954885}
  },
  {
    title: 'badra',
    position: {lat: 31.898035, lng: 34.810469}
  },
  {
    title: 'abu hassan',
    position: {lat: 32.050319, lng: 34.750913}
  },
  {
    title: 'bahadonas',
    position: {lat: 32.174515, lng: 34.891622}
  }
];

var hummusIcon = 'images/hummus-icon.png'

// ajax functions:
var setPhotoFromFourSquare = function(googleMarker) {
  var id;
  var url;
  $.ajax(
    {
      url: 'https://api.foursquare.com/v2/venues/search?ll=' + googleMarker.position.lat() + ',' + googleMarker.position.lng() +
      '&client_id=' + 'G1QGK54FRVYWNFQLIVRFKSHRE12IXJH3MZSEUPW3XX3G0OPR' + '&client_secret=' +
      'YQRY2GECSF4ERFHMDTSETWMQ0YWHM4QUDNPSZ2RQ053SF5WL' + '&v=20160924',
      success: function(response){
        console.log(response.response.venues[0].id);
        id = response.response.venues[0].id;
        $.ajax(
          {
            url: 'https://api.foursquare.com/v2/venues/' +
            id + '/photos?' + '&client_id=' + 'G1QGK54FRVYWNFQLIVRFKSHRE12IXJH3MZSEUPW3XX3G0OPR' + '&client_secret=' +
            'YQRY2GECSF4ERFHMDTSETWMQ0YWHM4QUDNPSZ2RQ053SF5WL' + '&v=20160924',
            success: function (response){
              var prefix = response.response.photos.items[0].prefix;
              var suffix = response.response.photos.items[0].suffix;
              url = prefix + '200x200' + suffix;
              console.log(url);
            }
          }
        )
      }
    })

    return url;
}


// marker object - handles googlemaps marker and knockout observables.
var Marker = function(map, title, lat, lng) {
  var googleMarker;

  this.lat = lat;
  this.lng = lng;
  this.title = title;

  googleMarker = new google.maps.Marker({
    position: new google.maps.LatLng(lat, lng),
    animation: google.maps.Animation.DROP,
    icon: hummusIcon,
    title: title
  });

  this.isVisible = ko.observable(false);

  this.isVisible.subscribe(function(bool){
    if (bool){
      googleMarker.setMap(map);
    } else {
      googleMarker.setMap(null);
    }
  });

  this.isVisible(true);


  this.clicked = function(){
    if (googleMarker.getAnimation() !== null) {
      googleMarker.setAnimation(null);
    } else {
      googleMarker.setAnimation(google.maps.Animation.BOUNCE);
    }
    setTimeout(function(){
      googleMarker.setAnimation(null);
    }, 2000)
    var picUrl = getPhotoFromFourSquare(googleMarker);
    var content = googleMarker.title + '<br>' +
    '<img src=\'' + picUrl + '\'>';
    infoWindow.setContent(content);
    infoWindow.open(map, googleMarker);
  }

  var self = this;
  googleMarker.addListener('click', function(){
    self.clicked();
  });

  this.googleMarker = googleMarker;
}

var viewModel = {
  markersArray: ko.observableArray([]),
  showAll: function(){
    viewModel.markersArray().forEach(function(marker){
      marker.isVisible(true);
    })
  },
  showNorth: function(){
    viewModel.markersArray().forEach(function(marker){
      if (marker.lat > 32.174515) {
        marker.isVisible(true);
      } else {
        marker.isVisible(false);
      }
    })
  },
  showCenter: function(){
    viewModel.markersArray().forEach(function(marker){
      if (marker.lat < 32.480551 && marker.lat > 31.898035) {
        marker.isVisible(true);
      } else {
        marker.isVisible(false);
      }
    })
  },
  showSouth: function(){
    viewModel.markersArray().forEach(function(marker){
      if (marker.lat < 32.050319) {
        marker.isVisible(true);
      } else {
        marker.isVisible(false);
      }
    })
  },
  geocodingError: ko.observable(false),
  userEnteredLocation: ko.observable(false),
  distanceError: ko.observable(false),
  duration: ko.observable('')
};

var map;
var infoWindow;
var geocoder;
var usersLocatonMarker;
var service;

function initMap(){
  map = new google.maps.Map(document.getElementById('map') , {
    center : {lat: 32.0853, lng: 34.7818},
    zoom: 8
  });

  markerData.forEach(function(currentMarkerData){
    var title = currentMarkerData.title;
    var lat = currentMarkerData.position.lat;
    var lng = currentMarkerData.position.lng;

    var marker = new Marker(map, title, lat, lng );

    viewModel.markersArray.push(marker);
  })

  infoWindow = new google.maps.InfoWindow({
    content: ''
  });

  geocoder = new google.maps.Geocoder();

  usersLocatonMarker = new google.maps.Marker({icon: 'images/smiley face icon.png'});

  service = new google.maps.DistanceMatrixService();

};


ko.applyBindings(viewModel);

// filter event listeners:
document.getElementById('all').addEventListener('click', viewModel.showAll);
document.getElementById('north').addEventListener('click', viewModel.showNorth);
document.getElementById('center').addEventListener('click', viewModel.showCenter);
document.getElementById('south').addEventListener('click', viewModel.showSouth);

// geocode data entered by user and use it to update the users marker
document.getElementById('usersLocationForm').addEventListener('submit', function(event){
  event.preventDefault();
  var usersLocation = document.getElementById('usersLocation').value;

  geocoder.geocode( {'address': usersLocation} , function(results, status) {
      if ( status == 'OK') {
        viewModel.geocodingError(false);
        usersLocatonMarker.setMap(map);
        usersLocatonMarker.setPosition(results[0].geometry.location);
        viewModel.userEnteredLocation(true);
      } else {
        viewModel.geocodingError(true);
        viewModel.userEnteredLocation(false);
      }
  } );
})

// calculates and shows the time to arrive from your city to a chosen hummus place by car
document.getElementById('navigate').addEventListener('click', function(){
  var updateDistanceError = function(bool = true, duration = '') {
    viewModel.distanceError(bool);
    viewModel.duration(duration);
  }

  if (infoWindow.anchor == null) {
    updateDistanceError();
  };
  service.getDistanceMatrix(
    {
      origins: [usersLocatonMarker.position],
      destinations: [infoWindow.anchor.position],
      travelMode: 'DRIVING'
    }, function(response, status){
      if ( status == 'OK') {
        try {
          response.rows[0].elements[0].duration.text;
        } catch(err) {
          updateDistanceError();
        }
        updateDistanceError(false, response.rows[0].elements[0].duration.text);

        // console.log(response.rows[0].elements[0].duration.text)
      } else {
        // console.log('error');
        updateDistanceError();
      }
    });
})
