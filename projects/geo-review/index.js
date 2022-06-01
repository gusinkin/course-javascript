import './index.html';
import './styles.css';
import { formTemplate } from './templates.js';

let clusterer;

document.addEventListener('DOMContentLoaded', () => {
  ymaps.ready(init);
  function init() {
    const myMap = new ymaps.Map('map', {
      center: [56.311465, 43.97923],
      zoom: 12,
    });

    myMap.events.add('click', async function (e) {
      const coords = e.get('coords');
      openBalloon(myMap, coords, []);
    });

    clusterer = new ymaps.Clusterer({
      clusterDisableClickZoom: true,
    });
    clusterer.options.set('hasBalloon', false);

    getGeoObjects(myMap);

    clusterer.events.add('click', function (e) {
      let geoObjectsInCluster = e.get('target').getGeoObjects();

      function setReviewCoords(objects) {
        let currentCoords;
        let sameCoords = true;
        for (const item of objects) {
          if (
            JSON.stringify(item.geometry._coordinates) !==
            JSON.stringify(objects[0].geometry._coordinates)
          ) {
            sameCoords = false;
            break;
          }
        }
        if (sameCoords) {
          currentCoords = objects[0].geometry._coordinates;
        } else {
          currentCoords = e.get('coords');
        }
        return currentCoords;
      }

      openBalloon(myMap, setReviewCoords(geoObjectsInCluster), geoObjectsInCluster);
    });
  }
});

function getGeoObjects(map) {
  const geoObjects = [];
  for (const review of getReviewsFromLS()) {
    const placemark = new ymaps.Placemark(review.coords);
    placemark.events.add('click', (e) => {
      e.stopPropagation();
      openBalloon(map, review.coords, [e.get('target')]);
    });
    geoObjects.push(placemark);
  }

  clusterer.removeAll();
  map.geoObjects.remove(clusterer);
  clusterer.add(geoObjects);
  map.geoObjects.add(clusterer);
}

function getReviewsList(cluster) {
  let reviewsListHTML = '';
  for (const review of getReviewsFromLS()) {
    if (
      cluster.some(
        (geoObject) =>
          JSON.stringify(geoObject.geometry._coordinates) ===
          JSON.stringify(review.coords)
      )
    ) {
      reviewsListHTML += `<div class="review">
      <strong><span>${review.author}</span></strong> <span>${review.place}</span>
      <div>${review.review}</div>
      <br>
    </div>`;
    }
  }
  return reviewsListHTML;
}

function getReviewsFromLS() {
  return JSON.parse(localStorage.reviews || '[]');
}

async function openBalloon(map, coords, currentGeoObjects) {
  await map.balloon.open(coords, {
    content: `<div class='reviews'>${getReviewsList(
      currentGeoObjects
    )}</div> ${formTemplate}`,
  });

  const form = document.querySelector('#add-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const review = {
      coords: coords,
      author: form.elements.author.value,
      place: form.elements.place.value,
      review: form.elements.review.value,
    };

    localStorage.reviews = JSON.stringify([...getReviewsFromLS(), review]);
    getGeoObjects(map);
    map.balloon.close();
  });
}
