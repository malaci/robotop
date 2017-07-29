(function($){
  $(function(){

    $('.button-collapse').sideNav();
    if(app.onInit){
      google.maps.event.addDomListener(window, 'load', app.onInit());

    }
  }); // end of document ready
})(jQuery); // end of jQuery name space