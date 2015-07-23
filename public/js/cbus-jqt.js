var classon = "item-on";
var classoff = "item-off";

// DIM THE LIGHTS STUFF
var pos, thisid;
var speed = 2.8;
var moved = false;

var $container = $('#content');

$(document).ready(function(){
    // get the devices from the server
    console.log("I am ready");
    
    $.getJSON('/devices', function( data ) {
        //console.log(data);

        // load all the known devices into the grid
        //data.length = 5;
        for(var i=0;i<data.length;i++) {
            if (!data[i].name){
                data[i].name = "Group "+data[i].group;
            }
            if(data[i].level>0){
                data[i].status = 'on';
                thischecked = 'checked';
            } else {
                data[i].status = 'off';
                thischecked = '';
            }
            var newItem = $(
              '<div class="ui-grid-b" data-filtertext="'+data[i].location+'">'
            + '<div class="ui-block-a">'
            +   '<p>'+data[i].name+'</p>'
            + '</div>'
            +  '<div class="ui-block-b">'
            +   '<label for="slider-'+data[i].group+'" class="ui-hidden-accessible">Level</label>'
            //+   '<input name="slider-'+data[i].group+'" id="slider-'+data[i].group+'" data-highlight="true" data-show-value="true" data-popup-enbled="true" min="0" max="100" value="'+data[i].level+'" type="range">'
            +   '<input name="slider-'+data[i].group+'" id="slider-'+data[i].group+'" data-highlight="true" data-show-value="false" data-popup-enbled="false" min="0" max="100" value="'+data[i].level+'" type="range" step="5">'
            + '</div>'
            + '<div class="ui-block-c">'
            +   '<label for="flip-'+data[i].group+'" class="ui-hidden-accessible">Toggle</label>'
            +   '<input data-role="flipswitch" name="flip-'+data[i].group+'" id="flip-'+data[i].group+'" data-mini="true" type="checkbox" '+thischecked+'>'
            + '</div>'
            + '</div>');

            $('#device-list').append( newItem );
            $('#slider-'+data[i].group).slider().slider('refresh');
            $('#flip-'+data[i].group).flipswitch().flipswitch('refresh');
            
        }
    });

    $.getJSON('/locations',function( data ) {
        //console.log(data);

        //data.length=5;
        // load all the known devices into the grid
        for(var i=0;i<data.length;i++) {
            var locname = data[i];
            //console.log(locname);
            if(locname){
                var newItem = $('<li><a href="#" data-filter="'+locname+'">'+locname+'</a></li>');
                $('#left-filters').append( newItem );
                //console.log('added '+newItem);
            }

        }

        $('#left-filters').listview("refresh");
    });

    // filter items when filter link is clicked
    $('#left-filters').on('click','a',function(event){
        var selector = $(this).attr('data-filter');
        $('#device-search').val(selector);
        $('#device-list').filterable('refresh');
        $('#device-search').val('');
        $('#left-panel').panel('close');
    });

    $('#device-list').on('slidestop', function(event) {
        thisid = event.target.id.split('-').pop();
        if (event.target.type == "range") {
            level = event.target.value;
        } else {
            level = event.target.checked;
        }
        adjustLevel(thisid,level);
        return false;
    });
});




    // REALTIME SOCKET STUFF

    var socket = io.connect();

    socket.on('connect', function (data) {
        console.log('connected to socket.io');
        // bootstrap
    });

    socket.on('statusStream', function (data) {
        console.log(data);
        if (data.type == 'update_status') {
            var slider = $('#slider-'+data.group);
            var flip = $('#flip-'+data.group);

            if(data.level==0){
                if (slider.is(':focus') == false) {
                    slider.prop('value', 0).slider('refresh');
                }
                if (flip.is(':focus') == false) {
                    flip.prop('checked', false).flipswitch('refresh');
                }
            }
            else {
                if (slider.is(':focus') == false) {
                    slider.prop('value', data.level).slider('refresh');
                }
                if (flip.is(':focus') == false) {
                    flip.prop('checked', true).flipswitch('refresh');
                }
            }

/*
            var msg = "Group " + data.group;

            if(data.name){
                msg = data.name;
            }

            if(data.location){
                msg = msg + ' in the ' + data.location;
            }

            if(data.level == 100 || data.level == 0){
                msg = msg + ' is ' + data.status.toUpperCase();
            } else {
                msg = msg + ' dimmed to ' + data.level +'%';
            }

            alertify.log(msg);
*/
        }
    });

    // if no dimlevel is specified, the light will toggle on/off
    function adjustLevel(id, dimlevel) {
        apitimeout = 0;
        apidelay = 0;
        if (dimlevel === false) {
            apilevel = 0;
            turnme = "off";
        }
        else if (dimlevel === true) {
            apilevel = 100;
            turnme = "on";
        } 
        else {
            dimlevel = (dimlevel > 100) ? 100 : dimlevel;
            dimlevel = (dimlevel < 0) ? 0 : dimlevel;
            apilevel = dimlevel;
            turnme = "dim to "+dimlevel;
        }
        console.log("Turning "+id+" "+turnme);
        $.getJSON('/cmd?device='+id+'&level='+apilevel+'&timeout='+apitimeout+'&delay='+apidelay);
    };
    

