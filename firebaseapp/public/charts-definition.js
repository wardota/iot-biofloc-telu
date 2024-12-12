// Create the charts when the web page loads
window.addEventListener('load', onload);

function onload(event){
  chartT = createTemperatureChart();
  chartH = createHumidityChart();
  chartP = createPressureChart();
}


// Create Temperature Chart
function createTemperatureChart() {
  var chart = new Highcharts.Chart({
    chart:{ 
      renderTo:'chart-temperature',
      type: 'spline' ,
      zooming: {
          type: 'x'
      } ,
      panning: true,
      panKey: 'shift'
    },
    series: [
      {
        name: 'DS18B20'
      }
    ],
    title: { 
      text: undefined
    },
    plotOptions: {
      line: { 
        animation: false,
        dataLabels: { 
          enabled: true 
        }
      }
    },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: { second: '%H:%M:%S' },  // Assuming your data is time-based
      scrollbar: {
        enabled: true,  // Enables the scrollbar
      }
    },
    yAxis: {
      title: { 
        text: 'Temperature Celsius Degrees' 
      }
    },
    credits: { 
      enabled: false 
    },
    rangeSelector: {
      enabled: true
    },
    navigator: {
      enabled: true
    }
  });
  return chart;
}

// Create Humidity Chart
function createHumidityChart(){
  var chart = new Highcharts.Chart({
    chart:{ 
      renderTo:'chart-humidity',
      type: 'spline'  ,
      zooming: {
          type: 'x'
      } ,
      panning: true,
    },
    series: [{
      name: 'sen0189'
    }],
    title: { 
      text: undefined
    },    
    plotOptions: {
      line: { 
        animation: false,
        dataLabels: { 
          enabled: true 
        }
      },
      series: { 
        color: '#50b8b4' 
      }
    },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: { second: '%H:%M:%S' }
    },
    yAxis: {
      title: { 
        text: 'Turbidity (NTU)' 
      }
    },
    credits: { 
      enabled: false 
    },
    rangeSelector: {
      enabled: true
    },
    navigator: {
      enabled: true
    }
  });
  return chart;
}

// Create Pressure Chart
function createPressureChart() {
  var chart = new Highcharts.Chart({
    chart:{ 
      renderTo:'chart-pressure',
      type: 'spline' ,
      zooming: {
          type: 'x'
      } ,
      panning: true,
    },
    series: [{
      name: 'PH-4502C'
    }],
    title: { 
      text: undefined
    },    
    plotOptions: {
      line: { 
        animation: false,
        dataLabels: { 
          enabled: true 
        }
      },
      series: { 
        color: '#A62639' 
      }
    },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: { second: '%H:%M:%S' }
    },
    yAxis: {
      title: { 
        text: 'pH' 
      }
    },
    credits: { 
      enabled: false 
    },
    rangeSelector: {
      enabled: true
    },
    navigator: {
      enabled: true
    }
  });
  return chart;
}

