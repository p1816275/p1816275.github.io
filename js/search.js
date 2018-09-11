/* 
   Author:   Baptist Chen
   Date:     06 Aug 2018, 11 Aug 2018
   Program: Simple search function created for WCD
   Version: 1.2
   
 */

$(document).ready( function() {
	var indexfilename = "search_index.txt";

	//Search DBs
	var filelist = [];
	var search_results = [];
	var search_engine_ready = false;

	//Master db for js search engine
	var cookies_name = "cookies_search_index";
	var fileindex = getCookie(cookies_name);
	if(fileindex == ""){
		$.ajax({
			type: "GET",
			url: indexfilename,
			dataType: "text",
			success: function(data){
				fileindex = data.split('\n');
				setCookie(cookies_name,JSON.stringify(fileindex),0);
				validateFileIndex();
			},
			error: function(data){
			}
		});		
	}else{
		fileindex = JSON.parse(fileindex);
		validateFileIndex();
	}
	
	function validateFileIndex(){
		if(filelist.length > 0) return;

		for (let i = 0; i < fileindex.length; i++) {	
			let file = {};
			file.id = "search-page-checker"+i;
			file.exists = null;
			file.name = fileindex[i].trim();
			file.content = "";
			file.excerpt = "";
			file.title = "Untitled Page";
			if(file.name == "") continue;
			
			var current_site_fn = getFileName(); 
			if(current_site_fn == file.name){
				file.title = $("title").text().trim();
				if(file.title == "") file.title = "Untitled Page";
				file.content = getTextFromJSsearchTag($("html").html());
				if(file.content=="") file.content = getTextFromHTMLTag($("html").html(),"body");
				file.exists = true;
			}else{
				//create new element if it doesn't exist
				$.ajax({
					type: "GET",
					url: file.name,
					dataType: "text",
					success: function(data){
						file.exists = true;
						file.title = getTextFromHTMLTag(data,"title");
						if(file.title == "") file.title = "Untitled Page";
						file.content = getTextFromJSsearchTag(data); 
						if(file.content=="") file.content = getTextFromHTMLTag(data,"body");
					},
					error: function(data){
						file.exists = false;
					}
				});
			}
			filelist.push(file);
		}		
		checkFileLoadingStatus();
	}
	
	function checkFileLoadingStatus(){
		for (let i = 0; i < filelist.length; i++) {
			if(filelist[i].exists === null){
				setTimeout(function(){
					checkFileLoadingStatus();
				},300);
				return;
			}
		}
		search_engine_ready = true;
	}	
	
    function search(searchedText){
		
		if(!search_engine_ready){
			setTimeout(function(){
				search(searchedText);
			},500);
		}
		
		let st = searchedText.trim().toLowerCase();
		search_results = [];
		for (let i = 0; i < filelist.length; i++) {
			let targetfile = filelist[i];
			let filecontent = targetfile.content;			
			if(filecontent == "") continue;
			
			var c = filecontent.toLowerCase();
			if(c.includes(st)){
				targetfile.excerpt = filecontent.replace(new RegExp(st, 'ig'), '<span class="js-search-found-text">' + st + '</span>')
				search_results.push(targetfile);
			}			
		}	

		$( "#dialog-js-search div.loading" ).hide();
		$( "#dialog-js-search div.message" ).show();			
		showSearchResults();
    }
	
	function showSearchResults(){
		let totalresults = search_results.length;
		let msg = "<h3>Search found:  " + totalresults + " results</h3>";
		for (let i = 0; i < totalresults; i++) {	
			let file = search_results[i];
			msg += `<div class='js-search-result-block'><a href='${file.name}'>${file.title} (${file.name})</a>: ${file.excerpt}</div>`;
		}	
		
		$( "#dialog-js-search div.message" ).html(msg);
	}
	
    $( "#dialog-js-search" ).dialog({
	  autoOpen: false,
      modal: true,  
	  resizable: false,
	  width:'auto',
      buttons: {
        Ok: function() {
          $( this ).dialog( "close" );
        }
      },
    });	
	
	$( ".js-search-now" ).click(function(){		
		var search_text_object = $( ".js-search-text" ).length;
		if( $( ".js-search-text" ).length == 0){
			alert("Your search form needs to have an input element with class name 'js-search-text'");
			return;
		}
		let search_text = $( ".js-search-text" ).val().trim();
		if(search_text =="") {alert("please enter a text to search"); return;}
		
		$( "#dialog-js-search div.message" ).html(""); //clear previous results
		$( "#dialog-js-search div.message" ).hide();
		$( "#dialog-js-search div.loading" ).show();
		$( "#dialog-js-search" ).dialog( "open" );
		search(search_text);
	});	
	
	
	//--------------- Special functions ------------------------------//
	
	function getFileName() {
		var url = document.location.href;
		url = url.substring(0, (url.indexOf("#") == -1) ? url.length : url.indexOf("#"));
		url = url.substring(0, (url.indexOf("?") == -1) ? url.length : url.indexOf("?"));
		url = url.substring(url.lastIndexOf("/") + 1, url.length);
		return url;
	}	
	
	function getTextFromHTMLTag(htmlcontent, target_tag){
		let n1 = htmlcontent.search(new RegExp("<"+target_tag+"[^>]*>", 'im'));
		if(n1 < 0) return "";
		let n2 = htmlcontent.search(new RegExp("</"+target_tag+"[^>]*>", 'im'));					
		let tag_content = htmlcontent.substring(n1,n2) + "</"+target_tag+">";
		tag_content = tag_content.replace(new RegExp("\r?\n|\r", 'g')," "); //remove all newline control characters
		tag_content = tag_content.replace(new RegExp("<!--NO-JS-SEARCH-BEGIN-->(.*?)<!--NO-JS-SEARCH-END-->", 'ig'),"");
		return tag_content.replace(/(<([^>]+)>)/ig," ").trim(); //remove all html tags
	}

	function getTextFromJSsearchTag(htmlcontent){
		let ss = "<!--JS-SEARCH-CONTENT-BEGIN-->";
		let n1 = htmlcontent.search(new RegExp(ss, 'im'));
		if(n1 < 0) return "";
		n1 += ss.length;
		let n2 = htmlcontent.search(new RegExp("<!--JS-SEARCH-CONTENT-END-->", 'im'));					
		let tag_content = htmlcontent.substring(n1,n2);		
		tag_content = tag_content.replace(new RegExp("\r?\n|\r", 'g')," "); //remove all newline control characters
		tag_content= tag_content.replace(new RegExp("<!--NO-JS-SEARCH-BEGIN-->(.*?)<!--NO-JS-SEARCH-END-->", 'ig'),"");
		tag_content = tag_content.replace(/<(?:.|\n)*?>/gm, '').trim(); //remove all html tags
		return tag_content;
	}
	
	function setCookie(cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var expires = (exdays == 0)? "" : ";expires="+d.toUTCString();
		document.cookie = cname + "=" + cvalue + expires + ";path=/";
	}

	function getCookie(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		
		for(var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) == 0) {
				return c.substring(name.length, c.length);
			}
		}
		return "";
	}

		
});
