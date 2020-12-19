// THIS IS A MODIFIED COPY OF 1.1 CREATED TO SUPPORT VUE
import { setDefaultOptions, loadModules } from 'esri-loader';
setDefaultOptions({ version: '3.34' });

// eslint-disable 
export {loadAuth, loginUser};

function loadAuth() {
    var parser = new DOMParser();
    var doc = parser.parseFromString(
    `<div
        id="anonymousPanel"
        style="display: none; padding: 5px; text-align: center;
            background: white;
            position: absolute;
            z-index: 100000;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;"
    >
        <span id="sign-in" style="
			color: blue;
			cursor: pointer;
			text-decoration: underline;">Sign In
		</span> to view this secured resource.
    </div>
    <div id="signedInPanel"
		style="
			display: none; 
			padding: 5px;
			text-align: center;
            z-index: 100000;
			position: absolute;
			top: 0;
			right: 0;
			background-color: gray;
			color: white;"
    >
		Welcome <span id="username"
		></span> - 
    <span id="sign-out" style="
		cursor: pointer;
		text-decoration: underline;">Sign Out</span>`,
    "text/html")
    doc.body.childNodes.forEach((node) => document.body.appendChild(node))
}

function loginUser(bundle) {
	let blurredElement = bundle.blurredElement
	let esriVersion = 3

	return new Promise((resolve, reject) => {
		loadModules(
			["esri/arcgis/Portal",
			"esri/arcgis/OAuthInfo",
			"esri/IdentityManager"])
		.then(([Portal, OAuthInfo, esriId]) => {
				var anonPanelElement = document.getElementById("anonymousPanel");
				var signedInPanel = document.getElementById("signedInPanel");
				
				var groupsNeeded = bundle.groupsNeeded
				var portalUrl = bundle.portalUrl
				var appId = bundle.appId
				
				var info = new OAuthInfo({
					appId: appId,
					portalUrl: portalUrl,
					popup: false
				});
				esriId.registerOAuthInfos([info]);
				esriId
					.checkSignInStatus(info.portalUrl + "/sharing")
					.then(function (user) {
						
						let portal
						if (esriVersion === 3) {
							portal = new Portal.Portal(portalUrl).signIn().then(
								portalUser => portalUser.getGroups().then(
									groups => checkGroups(groups)
								)
							)
						} else if (esriVersion === 4) {
							portal = new Portal({ url: portalUrl});

							portal.load().then(() => {
								// portal.user.fetchGroups().then(checkGroups(groups))
							})
						}
						function checkGroups(groups) {
							let matchCount = 0;
							groups.forEach((group) => {
								if (groupsNeeded.includes(group.title)) {
									matchCount++
								}
							})
							signedInPanel.style.display = "block";
							signedInPanel.firstElementChild.innerHTML = user.userId;

							// The user has all needed groups
							if (matchCount == groupsNeeded.length) {
								document.getElementById(blurredElement).style.opacity = 1;
								anonPanelElement.style.display = "none";
								resolve({
									token: user.token,
									userId: user.userId
								})
							}
							else {
								document.getElementById(blurredElement).style.opacity = 0.2;
								anonPanelElement.style.display = "block";
								anonPanelElement.innerText = "Logged-in user doesn't have sufficient credentials - Call IT for Access x5475"
								reject({errorMessage: "Logged in user doesn't have credentials to access this resource: " + user.userId})
							}
						}
						
				}).catch(function () {
						// Anonymous view
						document.getElementById(blurredElement).style.opacity = 0.2;
						anonPanelElement.style.display = "block";
				});

				document.getElementById("sign-in")
					.addEventListener("click", function() {
						// User will be redirected to OAuth Sign In page
						console.log(info.portalUrl)
						esriId.getCredential(info.portalUrl + "/sharing");
				});

				document.getElementById("sign-out")
					.addEventListener("click", function() {
						esriId.destroyCredentials();
						window.location.reload();
					})
			}
		)
	})
}