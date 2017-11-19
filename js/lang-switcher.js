(function(){
	var lang = (navigator.browserLanguage || navigator.language || navigator.userLanguage);

	window.addEventListener('DOMContentLoaded', function(){
		if(/^ja/.test(lang)) {
			document.body.classList.add('ja');
		} else {
			document.body.classList.add('en');
		}
	});
})();