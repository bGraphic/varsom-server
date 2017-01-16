# varsom-server
Server responsible for importing data from api.nve.no into firebase. 

To test the import job locally run: `heroku local:run node jobs/import-forecasts.js`

## api node in firebase database
This node is used to set the urls used when importing.

### Production
For Varsom in production they should be set to the values below
```
{
    avalanche: "http://api01.nve.no/hydrology/forecast/avalanche/v3.0.0/api/RegionSummary/Detail/1/",
    flood: "http://api01.nve.no/hydrology/forecast/flood/v1.0.3/api/CountySummary/1/",
    landslide: "http://api01.nve.no/hydrology/forecast/landslide/v1.0.3/api/CountySummary/1/"
}
```
### Testing
For testing purposes they can be changed to the test api, or set to import specific dates from the production api. 

**Specific dates**
29. of December 2016 is a good data for alle forecast types:
```
{
    avalanche: "http://api01.nve.no/hydrology/forecast/avalanche/v3.0.0/api/RegionSummary/Detail/1/2016-12-29/",
    flood: "http://api01.nve.no/hydrology/forecast/flood/v1.0.3/api/CountySummary/1/2016-12-29/",
    landslide: "http://api01.nve.no/hydrology/forecast/landslide/v1.0.3/api/CountySummary/1/2016-12-29/"
}
```

