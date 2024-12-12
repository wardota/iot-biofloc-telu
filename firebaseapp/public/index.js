// convert epochtime to JavaScripte Date object
function epochToJsDate(epochTime){
  return new Date(epochTime*1000 + (7 * 60 * 60 * 1000));
}
function epochToJsDateNormal(epochTime){
  return new Date(epochTime*1000);
}
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// convert time to human-readable format YYYY/MM/DD HH:MM:SS
function epochToDateTime(epochTime){
  var epochDate = new Date(epochToJsDateNormal(epochTime));
  var dateTime = epochDate.getFullYear() + "/" +
    ("00" + (epochDate.getMonth() + 1)).slice(-2) + "/" +
    ("00" + epochDate.getDate()).slice(-2) + " " +
    ("00" + epochDate.getHours()).slice(-2) + ":" +
    ("00" + epochDate.getMinutes()).slice(-2) + ":" +
    ("00" + epochDate.getSeconds()).slice(-2);

  return dateTime;
}

// function to plot values on charts
function plotValues(chart, timestamp, value){
  var x = epochToJsDate(timestamp).getTime();
  var y = Number (value);
  // if(chart.series[0].data.length > 100) {
  //   chart.series[0].addPoint([x, y], true, true, true);
    
  //   console.log('plotting');
  // } else {
  //   chart.series[0].addPoint([x, y], true, false, true);
  //   console.log('plotting2');
  // }
  chart.series[0].addPoint([x, y], true, false, true);
}

// DOM elements
const loginElement = document.querySelector('#login-form');
const contentElement = document.querySelector("#content-sign-in");
const sidecontentElement = document.querySelector("#sidecontent-sign-in");
const userDetailsElement = document.querySelector('#user-details');
const authBarElement = document.querySelector('#authentication-bar');
const deleteButtonElement = document.getElementById('delete-button');
const deleteModalElement = document.getElementById('delete-modal');
const deleteDataFormElement = document.querySelector('#delete-data-form');
const viewDataButtonElement = document.getElementById('view-data-button');
const hideDataButtonElement = document.getElementById('hide-data-button');
const tableContainerElement = document.querySelector('#table-container');
const chartsRangeInputElement = document.getElementById('charts-range');
const chartsdayRangeInputElement = document.getElementById('charts-dayrange');
const loadDataButtonElement = document.getElementById('load-data');
const cardsCheckboxElement = document.querySelector('input[name=cards-checkbox]');
const gaugesCheckboxElement = document.querySelector('input[name=gauges-checkbox]');
const chartsCheckboxElement = document.querySelector('input[name=charts-checkbox]');

// DOM elements for sensor readings
const cardsReadingsElement = document.querySelector("#cards-div");
const gaugesReadingsElement = document.querySelector("#gauges-div");
const chartsDivElement = document.querySelector('#charts-div');
const datatableDivElement = document.querySelector('#datatable-div');
const tempElement = document.getElementById("temp");
const humElement = document.getElementById("hum");
const presElement = document.getElementById("pres");
const tempTextElement = document.getElementById("tempText");
const humTextElement = document.getElementById("humText");
const presTextElement = document.getElementById("presText");
const updateElement = document.getElementById("lastUpdate")

// MANAGE LOGIN/LOGOUT UI
const setupUI = (user) => {
  if (user) {
    //toggle UI elements
    loginElement.style.display = 'none';
    contentElement.style.display = 'block';
    sidecontentElement.style.display = 'block';
    authBarElement.style.display ='block';
    userDetailsElement.style.display ='block';
    userDetailsElement.innerHTML = user.email;

    // get user UID to get data from database
    var uid = user.uid;
    console.log(uid);

    // // Database paths (with user UID)
    var dbPath = 'UsersData/' + uid.toString() + '/readings';
    var chartPath = 'UsersData/' + uid.toString() + '/charts/range';
    var chartdayPath = 'UsersData/' + uid.toString() + '/charts/day';

    // Database references
    var dbRef = firebase.database().ref(dbPath);
    var chartRef = firebase.database().ref(chartPath);
    var chartdayRef = firebase.database().ref(chartdayPath);

//---------------------------------------------------------
var readingsPath = 'UsersData/' + uid + '/readings';
var chartRangePath = 'UsersData/' + uid + '/charts/range';
var chartRef = firebase.database().ref(chartRangePath);
var isFirstFetch = true; 

var chartRange = 40; // Default value
var dayRange = 1 / 24; // Default value
var secGap = dayRange * 24 * 60 * 60 / chartRange; // Initial value

// Update `chartRange` and recalculate `secGap`
chartRef.on('value', snapshot => {
  chartRange = Number(snapshot.val());
  console.log('chartRange is:', chartRange);
  chartsRangeInputElement.value = chartRange; // Set the new range value
  isFirstFetch = true;
  recalculateSecGap();
});

// Update `dayRange` and recalculate `secGap`
chartdayRef.on('value', snapshot => {
  dayRange = Number(snapshot.val());
  console.log('dayRange is:', dayRange);
  chartsdayRangeInputElement.value = dayRange;
  isFirstFetch = true;
  recalculateSecGap();
});

// Function to recalculate `secGap`
function recalculateSecGap() {
  if (chartRange > 0 && dayRange > 0) {
    secGap = dayRange * 24 * 60 * 60 / chartRange;
    console.log('secGap recalculated:', secGap);
  } else {
    console.warn('Cannot recalculate secGap, invalid chartRange or dayRange.');
  }
}

var isFetchingData = false; // Flag to track if fetchAndPlotData is running
function toggleLoadingIndicator(show) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (show) {
    loadingIndicator.style.display = 'block';
  } else {
    loadingIndicator.style.display = 'none';
  }
}
chartRef.on('value', snapshot => {
  console.log('Fetching new chart range...');

  // Clear existing charts
  chartT.destroy();
  chartH.destroy();
  chartP.destroy();

  // Reinitialize charts
  chartT = createTemperatureChart();
  chartH = createHumidityChart();
  chartP = createPressureChart();

  // Fetch and plot data if not in progress
  if (!isFetchingData) {
    fetchAndPlotData();
  }
});

// Function to fetch and plot data
async function fetchAndPlotData() {
  
  console.log('secGap ', secGap);
  if (isFetchingData) {
    console.log('Fetch already in progress. Skipping...');
    return;
  }

  isFetchingData = true; // Set the flag to prevent overlapping calls
  if (isFirstFetch) {
    toggleLoadingIndicator(true);
  }
  try {
    let sampledData = [];
    let i = 1;
    const now = Math.floor(Date.now() / 1000); // Convert to seconds

    console.log('Starting data fetch at:', now);

    while (sampledData.length < chartRange) {
      const endTime = now - Math.floor(secGap) * i; // End of range (in seconds)
      const startTime = now - (Math.floor(secGap) * i + 20); // Start of range (in seconds)

      const snapshot = await firebase.database().ref(readingsPath)
        .orderByKey()
        .startAfter(startTime.toString())
        .endBefore(endTime.toString())
        .once('value');

      let rangeData = [];
      snapshot.forEach(childSnapshot => {
        rangeData.push(childSnapshot.val());
      });

      if (rangeData.length === 0) {
        
        if(i==chartRange){
          const timestamp = startTime;
          const temperature = 0;// + (getRandomInRange(1, 9) / 100);
          const humidity = 0 ;//+ (getRandomInRange(1, 9) / 100);
          const pressure = 7 ;//+ (getRandomInRange(1, 9) / 100);

          sampledData.push({ timestamp, temperature, humidity, pressure });
          
          console.log('No datapoint found anymore, created mockup data');
          break;
        }
        console.log('Mockup datapoint disabled, No data point found at', startTime);
      } else {
        console.log('Datapoint found');
        const dataa = snapshot.val();
        for (const timestampa in dataa) {
          const values = dataa[timestampa];
          const timestamp = timestampa;
          const temperature = values.temperature;
          const humidity = values.humidity;
          const pressure = values.pressure;
          sampledData.push({ timestamp, temperature, humidity, pressure });
        }
      }

      i++;
    }

    // Plot the sampled data
    sampledData.forEach(data => {
      plotValues(chartT, data.timestamp, data.temperature);
      plotValues(chartH, data.timestamp, data.humidity);
      plotValues(chartP, data.timestamp, data.pressure);
    });
    console.log('Data fetched and plotted');
    if (isFirstFetch) {
      toggleLoadingIndicator(false);
      isFirstFetch = false; // Set flag to false after the first fetch
    }
  } catch (error) {
    console.error('Error fetching and plotting data:', error);
    if (isFirstFetch) {
      toggleLoadingIndicator(false);
      isFirstFetch = false; // Set flag to false after the first fetch
    }
  } finally {
    isFetchingData = false; // Reset the flag after execution
  }
}

// Fetch and plot data every 30 seconds
setInterval(() => {
  if (!isFetchingData) {
    console.log('Refreshing data...');
    fetchAndPlotData();
    
  }
}, 30000); // 30000ms = 30 seconds

//---------------------------------------------------------



    //

    // Update database with new range (input field)
    chartsRangeInputElement.onchange = () =>{
      chartRef.set(chartsRangeInputElement.value);
    };
    chartsdayRangeInputElement.onchange = () =>{
      chartdayRef.set(chartsdayRangeInputElement.value);
    };

    //CHECKBOXES
    // Checbox (cards for sensor readings)
    cardsCheckboxElement.addEventListener('change', (e) =>{
      if (cardsCheckboxElement.checked) {
        cardsReadingsElement.style.display = 'block';
      }
      else{
        cardsReadingsElement.style.display = 'none';
      }
    });
    // Checbox (gauges for sensor readings)
    gaugesCheckboxElement.addEventListener('change', (e) =>{
      if (gaugesCheckboxElement.checked) {
        gaugesReadingsElement.style.display = 'block';
      }
      else{
        gaugesReadingsElement.style.display = 'none';
      }
    });
    // Checbox (charta for sensor readings)
    chartsCheckboxElement.addEventListener('change', (e) =>{
      if (chartsCheckboxElement.checked) {
        chartsDivElement.style.display = 'block';
      }
      else{
        chartsDivElement.style.display = 'none';
      }
    });

    // CARDS
    // Get the latest readings and display on cards
    dbRef.orderByKey().limitToLast(1).on('child_added', snapshot =>{
      var jsonData = snapshot.toJSON(); // example: {temperature: 25.02, humidity: 50.20, pressure: 1008.48, timestamp:1641317355}
      var temperature = jsonData.temperature;
      var humidity = jsonData.humidity;
      var pressure = jsonData.pressure;
      var timestamp = jsonData.timestamp;
      // Update DOM elements
      tempElement.innerHTML = temperature;
      humElement.innerHTML = humidity;
      presElement.innerHTML = pressure;
      switch(true) {
        case (humidity < 600):
            humText = 'Jernih';
            break;
        case (humidity >= 600 && humidity < 1200):
            humText = 'Cukup Jernih';
            break;
        case (humidity >= 1200 && humidity < 1800):
            humText = 'Cukup Keruh';
            break;
        case (humidity >= 1800 && humidity < 2400):
            humText = 'Keruh';
            break;
        case (humidity >= 2400 ):
            humText = 'Sangat Keruh';
            break;
        default:
            humText = 'Invalid Data';
      }
      switch(true) {
        case (pressure < 2):
            phText = 'Sangat Asam';
            break;
        case (pressure >= 2 && pressure < 4):
            phText = 'Asam';
            break;
        case (pressure >= 4 && pressure < 6):
            phText = 'Cukup Asam';
            break;
        case (pressure >= 6 && pressure < 8):
            phText = 'Normal';
            break;
        case (pressure >= 8 && pressure < 10):
            phText = 'Cukup Basa';
            break;
        case (pressure >= 10 && pressure < 12):
            phText = 'Basa';
            break;
        case (pressure >= 12):
            phText = 'Sangat Basa';
            break;
        default:
            phText = 'Invalid Data';
      }
      switch(true) {
        case (temperature < 10):
            tempText = 'Dingin Sekali';
            break;
        case (temperature >= 10 && temperature < 20):
            tempText = 'Dingin';
            break;
        case (temperature >= 20 && temperature < 25):
            tempText = 'Cukup Dingin';
            break;
        case (temperature >= 25 && temperature < 30):
            tempText = 'Normal';
            break;
        case (temperature >= 30 && temperature < 35):
            tempText = 'Cukup Panas';
            break;
        case (temperature >= 35 ):
            tempText = 'Panas';
            break;
        default:
            tempText = 'Invalid Data';
      }
      tempTextElement.innerHTML = tempText;
      humTextElement.innerHTML = humText;
      presTextElement.innerHTML = phText;
      updateElement.innerHTML = epochToDateTime(timestamp);
    });

    // GAUGES
    // Get the latest readings and display on gauges
    dbRef.orderByKey().limitToLast(1).on('child_added', snapshot =>{
      var jsonData = snapshot.toJSON(); // example: {temperature: 25.02, humidity: 50.20, pressure: 1008.48, timestamp:1641317355}
      var temperature = jsonData.temperature-3; // -3 for visual adjustment
      var humidity = jsonData.humidity;
      var pressure = jsonData.pressure;
      var timestamp = jsonData.timestamp;
      // Update DOM elements
      var gaugeT = createTemperatureGauge();
      var gaugeH = createHumidityGauge();
      var gaugeP = createPressureGauge();
      gaugeT.draw();
      gaugeH.draw();
      gaugeP.draw();
      gaugeT.value = temperature;
      gaugeH.value = humidity;
      gaugeP.value = pressure;
      updateElement.innerHTML = epochToDateTime(timestamp);
    });

    // DELETE DATA
    // Add event listener to open modal when click on "Delete Data" button
    deleteButtonElement.addEventListener('click', e =>{
      console.log("Remove data");
      e.preventDefault;
      deleteModalElement.style.display="block";
    });

    // Add event listener when delete form is submited
    deleteDataFormElement.addEventListener('submit', (e) => {
      // delete data (readings)
      dbRef.remove();
    });

    // TABLE
    var lastReadingTimestamp; //saves last timestamp displayed on the table
    // Function that creates the table with the first 100 readings
    function createTable(){
      // append all data to the table
      var firstRun = true;
      dbRef.orderByKey().limitToLast(100).on('child_added', function(snapshot) {
        if (snapshot.exists()) {
          var jsonData = snapshot.toJSON();
          console.log(jsonData);
          var temperature = jsonData.temperature;
          var humidity = jsonData.humidity;
          var pressure = jsonData.pressure;
          var timestamp = jsonData.timestamp;
          var content = '';
          content += '<tr>';
          content += '<td>' + epochToDateTime(timestamp) + '</td>';
          content += '<td>' + temperature + '</td>';
          content += '<td>' + humidity + '</td>';
          content += '<td>' + pressure + '</td>';
          content += '</tr>';
          $('#tbody').prepend(content);
          // Save lastReadingTimestamp --> corresponds to the first timestamp on the returned snapshot data
          if (firstRun){
            lastReadingTimestamp = timestamp;
            firstRun=false;
            console.log(lastReadingTimestamp);
          }
        }
      });
    };

    // append readings to table (after pressing More results... button)
    function appendToTable(){
      var dataList = []; // saves list of readings returned by the snapshot (oldest-->newest)
      var reversedList = []; // the same as previous, but reversed (newest--> oldest)
      console.log("APEND");
      dbRef.orderByKey().limitToLast(100).endAt(lastReadingTimestamp).once('value', function(snapshot) {
        // convert the snapshot to JSON
        if (snapshot.exists()) {
          snapshot.forEach(element => {
            var jsonData = element.toJSON();
            dataList.push(jsonData); // create a list with all data
          });
          lastReadingTimestamp = dataList[0].timestamp; //oldest timestamp corresponds to the first on the list (oldest --> newest)
          reversedList = dataList.reverse(); // reverse the order of the list (newest data --> oldest data)

          var firstTime = true;
          // loop through all elements of the list and append to table (newest elements first)
          reversedList.forEach(element =>{
            if (firstTime){ // ignore first reading (it's already on the table from the previous query)
              firstTime = false;
            }
            else{
              var temperature = element.temperature;
              var humidity = element.humidity;
              var pressure = element.pressure;
              var timestamp = element.timestamp;
              var content = '';
              content += '<tr>';
              content += '<td>' + epochToDateTime(timestamp) + '</td>';
              content += '<td>' + temperature + '</td>';
              content += '<td>' + humidity + '</td>';
              content += '<td>' + pressure + '</td>';
              content += '</tr>';
              $('#tbody').append(content);
            }
          });
        }
      });
    }

    viewDataButtonElement.addEventListener('click', (e) =>{
      // Toggle DOM elements
      tableContainerElement.style.display = 'block';
      viewDataButtonElement.style.display ='none';
      hideDataButtonElement.style.display ='inline-block';
      loadDataButtonElement.style.display = 'inline-block'
      createTable();
    });

    loadDataButtonElement.addEventListener('click', (e) => {
      appendToTable();
    });

    hideDataButtonElement.addEventListener('click', (e) => {
      tableContainerElement.style.display = 'none';
      viewDataButtonElement.style.display = 'inline-block';
      hideDataButtonElement.style.display = 'none';
    });

  // IF USER IS LOGGED OUT
  } else{
    // toggle UI elements
    loginElement.style.display = 'block';
    authBarElement.style.display ='none';
    userDetailsElement.style.display ='none';
    contentElement.style.display = 'none';
    sidecontentElement.style.display = 'none';
  }
}

const exportButtonElement = document.getElementById('export-button');

exportButtonElement.addEventListener('click', async () => {
    try {
        // Fetch all data from Firebase
        const snapshot = await firebase.database().ref('UsersData/' + firebase.auth().currentUser.uid + '/readings').once('value');
        //const snapshot = await firebase.database().ref('UsersData/' + 'ZAEAzWu35GMenECKbVC0WIJgL0o2' + '/readings').once('value');
        const data = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const jsonData = childSnapshot.val();
                data.push({
                    Timestamp: epochToDateTime(jsonData.timestamp),
                    Temperature: jsonData.temperature,
                    Turbidity: jsonData.humidity,
                    pH: jsonData.pressure
                });
            });

            // Convert JSON to worksheet
            const ws = XLSX.utils.json_to_sheet(data);

            // Create a workbook and append the worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'SensorData');

            // Export to CSV file
            XLSX.writeFile(wb, 'SensorData.csv');
            alert('Data exported successfully!');
        } else {
            alert('No data found to export!');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data. Check the console for details.');
    }
});
