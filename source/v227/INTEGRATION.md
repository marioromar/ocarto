# Ocarto v227 integration

The release is assembled from the parent source plus these additions. In index.html, expose worldToLocal beside localToWorld on window. Load these files after geo-crs.js and before the version badge:

    <script src="streetview-tools.js"></script>
    <script src="streetview-ui.js"></script>
    <script src="osm-buildings.js"></script>
    <script src="osm-buildings-ui.js"></script>

Set the title and top status to Ocarto v227. Verify with npm test.