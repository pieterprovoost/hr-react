import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import { React, useEffect, useState } from "react";
import { Navbar, Container } from "react-bootstrap";
import { MapContainer, TileLayer, Popup, GeoJSON, LayerGroup, CircleMarker } from "react-leaflet";
import dayjs from "dayjs";
import "dayjs/locale/nl-be";
import {useLeafletContext} from '@react-leaflet/core';
import L from 'leaflet';
import {LocateControl} from "./LocateControl";

const colors = ["#fff7f3", "#fde0dd", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177", "#49006a"];

function formatDate(date) {
  return dayjs(date).locale("nl-be").format("dddd D/M H:mm");
}

function formatTime(date) {
  return dayjs(date).locale("nl-be").format("H:mm");
}

function parseDatetime(input) {
  const datePart = input.match(/([0-9]+)/)[1];
  const iso = datePart.substring(0, 4) + "-" + datePart.substring(4, 6) + "-" + datePart.substring(6, 8) + "T" + datePart.substring(8, 10) + ":" + datePart.substring(10, 12) + "Z";
  const date = new Date(Date.parse(iso));
  return date;
}

const Legend = (props) => {
  const context = useLeafletContext();
  L.Control.Legend = L.Control.extend({
    onAdd: function() {
      const usedColors = props.colors.slice(-props.labels.length);
      const el = L.DomUtil.create("div", "legend");
      el.innerHTML = "kans op hagel<br/>";
      for (var i = 0; i < usedColors.length; i++) {
        const label = "-" + i + " min";
        el.innerHTML += '<i style="background-color: ' + usedColors[i] + '"></i>' + props.labels[i] + '<br/>';
      }
      el.innerHTML += '<span style="padding-top: 5px; display: inline-block;"><i style="border-radius: 9px; border: 2px solid #fcad03;"></i>waarneming</span><br/>';
      return el;
    }
  });
  L.control.legend = function(opts) {
    return new L.Control.Legend(opts);
  }
  useEffect(() => {
    const container = context.layerContainer || context.map;
    const control = L.control.legend({ position: "topright" });
    container.addControl(control);
    return () => {
      container.removeControl(control);
    };
  });
  return null;
};

function App() {

  const [maps, setMaps] = useState([]);
  const [labels, setLabels] = useState([]);
  const [lastTime, setLastTime] = useState("");
  const [observations, setObservations] = useState({"type": "FeatureCollection", "features": []});
  const [i, setI] = useState(0);

  useEffect(() => {
    async function fetchData() {
      console.log("Fetching data");
      const res = await fetch("https://hagelradar.s3.eu-central-1.amazonaws.com/output.json");
      if (res.status === 200) {
        const data = await res.json();

        const newLabels = [];
        let newLastTime = "";

        data.maps.map((map) => {
          const parsed = parseDatetime(map.timestamp);
          newLastTime = formatDate(parsed);
          newLabels.push(formatTime(parsed));
        });

        setMaps(data.maps);
        setObservations(data.observations ? data.observations : data.alerts);
        setLabels(newLabels);
        setLastTime(newLastTime);
        setI(i => i + 1);
      }
    }
    fetchData();
    setInterval(() => {
      fetchData();
    }, 60000);
  }, []);

  return (
    <div className="App h-100 d-flex flex-column">
       <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand href="/">
            hagelradar.be
          </Navbar.Brand>
          <Navbar.Text className="text-black">{lastTime}</Navbar.Text>
        </Container>
      </Navbar>
      <MapContainer id="map" center={[50.3, 4.5]} zoom={8} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {
          maps && <LayerGroup key={"maps_" + i}>
            {
              maps.map((map, n) => <GeoJSON
                key={map.timestamp}
                data={map.geo}
                style={{"weight": 0, "color": colors[n], "fillOpacity": 0.7}}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(() => {
                    return "<span>Kans op hagel: " + Math.round(feature.properties.value / 255 * 100) + "%</span>"
                  }, {});
                }}
              />)
            }
          </LayerGroup>
        }
        {
          observations && <LayerGroup key={"observations_" + i}>
            {
              observations.features.map((feature) => <CircleMarker center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={10} color="#fcad03" weight={2} opacity={0.5} fillOpacity={0}>
                <Popup>{feature.properties.timestamp}<br/>{feature.properties.obs_intensity_description}</Popup>
              </CircleMarker>)
            }
          </LayerGroup>
        }
        <Legend labels={labels} colors={colors} />
        <LocateControl position="topleft" keepCurrentZoomLevel={true} />
        </MapContainer>
    </div>
  );
}

export default App;
