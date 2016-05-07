(function(){
	var style = document.createElement('style');
	style.type = "text/css";
	document.getElementsByTagName('head')[0].appendChild(style);
	css = document.styleSheets[0];
	css.insertRule(".en *:lang(ja){display:none;}",0);
	css.insertRule(".ja *:lang(en){display:none;}",0);
	var lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage);

	window.addEventListener('DOMContentLoaded', function(){
		if(/^ja/.test(lang)) {
			document.body.classList.add('ja');
		} else {
			document.body.classList.add('en');
		}
	});
})();