import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import { React, useEffect, useState } from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import { MapContainer, TileLayer, Popup, GeoJSON, LayerGroup, CircleMarker } from "react-leaflet";
import dayjs from "dayjs";
import "dayjs/locale/nl-be";
import {useLeafletContext} from "@react-leaflet/core";
import L from "leaflet";
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
        el.innerHTML += '<i style="background-color: ' + usedColors[i] + '"></i>' + props.labels[i] + '<br/>';
      }
      el.innerHTML += '<span style="padding-top: 5px; display: inline-block;"><i style="border-radius: 9px; border: 2px solid #fcad03;"></i>melding</span><br/>';
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
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  useEffect(() => {
    async function fetchData() {
      console.log("Fetching data");
      const res = await fetch("https://hagelradar.s3.eu-central-1.amazonaws.com/output.json");
      if (res.status === 200) {
        const data = await res.json();

        const newLabels = [];
        let newLastTime = "";

        data.maps.forEach((map) => {
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
          <Navbar.Text className="text-black" role="button" onClick={handleShow}>Info</Navbar.Text>
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

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>hagelradar.be</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" class="mb-1"><path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"></path></svg> <a rel="noreferrer" class="text-black" href="https://twitter.com/PieterPrvst" target="_blank">PieterPrvst</a></p>
          <p>hagelradar.be kan in geen geval aansprakelijk gesteld worden voor eventuele schade en rechtstreekse of onrechtstreekse gevolgen die uit het gebruik van de aangeboden informatie zou kunnen voortvloeien.</p>
          <p>Data van <a rel="noreferrer" class="text-black" href="https://www.meteo.be/" target="_blank">KMI</a> en <a rel="noreferrer" class="text-black" href="https://www.knmi.nl/" target="_blank">KNMI</a>.</p>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default App;
