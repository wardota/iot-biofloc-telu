#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
// #include <Adafruit_Sensor.h>
// #include <Adafruit_BME280.h>
#include "time.h"

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// Insert your network credentials
#define WIFI_SSID "Galaxy M12D95F" 
#define WIFI_PASSWORD "zxdh6690"

// Insert Firebase project web API Key
#define API_KEY "AIzaSyDyWHmUb3fVwdGHruhi0FK607qZQBw0_o4"

// Insert Authorized Email and Corresponding Password
#define USER_EMAIL "dimasbayu.bm@gmail.com"
#define USER_PASSWORD "123456"

// Insert RTDB URLefine the RTDB URL
#define DATABASE_URL "cms1-a0c7a.firebaseio.com"

#define ONE_WIRE_BUS 2 //pin 2
// Define Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Variable to save USER UID
String uid;

// Database main path (to be updated in setup with the user UID)
String databasePath;
// Database child nodes
String tempPath = "/temperature";
String phPath = "/pressure"; // "/pH";
String turbPath = "/humidity"; // "/turbidity";
String timePath = "/timestamp";

// Parent Node (to be updated in every loop)
String parentPath;
int counter = 0;
int timestamp;
FirebaseJson json;

const char* ntpServer = "pool.ntp.org";

float temperature;
float pH;
float turbidity;

float ntu;
float volt;
// Timer variables (send new readings every 10 detik)
unsigned long sendDataPrevMillis = 0;
unsigned long timerDelay = 10000;

// Initialize BME280
// void initBME(){
//   if (!bme.begin(0x76)) {
//     Serial.println("Could not find a valid BME280 sensor, check wiring!");
//     while (1);
//   }
// }

// LCD setup for I2C, address 0x27, 16 columns and 2 rows
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Sensor pins
//const int temperaturePin = 34;//34;  // GPIO 34 
const int phSensorPin =  34;//35;    // GPIO 35 for pH sensor (analog)
const int turbidityPin = 36;   // GPIO 36 for turbidity sensor (analog)  (kepake)

// Variables for scrolling text
String displayText;
int scrollPos = 0;
unsigned long previousMillis = 0;
const long interval = 250; // Scroll interval in milliseconds
unsigned long count = 0;

//ds18b20 dallas 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

//ph
float buf[100],tempph;

float ph(float voltage){
  //return  7 + ((2.5 -voltage)/0.357148); //0.18 example
  return  7 + ((2.5 -voltage)/0.18); //0.18 example
}
float round_to_dp( float in_value, int decimal_place )
{
  float multiplier = powf( 10.0f, decimal_place );
  in_value = roundf( in_value * multiplier ) / multiplier;
  return in_value;
}
// Initialize WiFi
void initWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi ..");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    lcd.clear();  
    lcd.setCursor(0, 0);               // Set the cursor to the first column and first row
    lcd.print("Connecting..");
    lcd.setCursor(0, 1);               // Set the cursor to the first column and first row
    lcd.print("to Wifi");
    delay(1000);
  }
  Serial.println(WiFi.localIP());
  Serial.println();
}

// Function that gets current epoch time
unsigned long getTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    //Serial.println("Failed to obtain time");
    return(0);
  }
  time(&now);
  return now;
}

void setup(){
  
  lcd.init();                       // Initialize the LCD
  lcd.backlight();                  // Turn on the backlight
  lcd.clear();   
  Serial.begin(115200);

  // Initialize BME280 sensor
  // initBME();
  initWiFi();
  configTime(0, 0, ntpServer);

  // Assign the api key (required)
  config.api_key = API_KEY;

  // Assign the user sign in credentials
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Assign the RTDB URL (required)
  config.database_url = DATABASE_URL;

  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(4096);

  // Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback; //see addons/TokenHelper.h

  // Assign the maximum retry of token generation
  config.max_token_generation_retry = 5;

  // Initialize the library with the Firebase authen and config
  Firebase.begin(&config, &auth);

  // Getting the user UID might take a few seconds
  Serial.println("Getting User UID");
  while ((auth.token.uid) == "") {
    Serial.print('.');
    lcd.clear();  
    lcd.setCursor(0, 0);               // Set the cursor to the first column and first row
    lcd.print("Connecting..");
    lcd.setCursor(0, 1);               // Set the cursor to the first column and first row
    lcd.print("to Firebase");
    delay(1000);
  }
  lcd.clear();
  lcd.setCursor(0, 0);               // Set the cursor to the first column and first row
  lcd.print("Connected");
  lcd.setCursor(0, 1);               // Set the cursor to the first column and first row
  lcd.print("to Firebase");
  // Print user UID
  uid = auth.token.uid.c_str();
  Serial.print("User UID: ");
  Serial.println(uid);

  // Update database path
  databasePath = "/UsersData/" + uid + "/readings";

  //ds18B20 dallas
  sensors.begin();

}

void loop(){

  //gagal ikut tutorial malah ph diatas 14 tembus 20
  for (int i=0;i<100;i++){
    buf[i]=analogRead(phSensorPin);
    delay(10);
  }
  float avgValue=0;
  for (int i=0;i<100;i++){
    avgValue+=buf[i];
  }
  float phVolt=(float)avgValue*5.0/4095.0/100; //float phVolt=(float)avgValue*5.0/4095.0/100;
  float phhValue= -5.70* phVolt + 21.34;
  float phviaFunc= ph(phVolt); 
  float myphestimate = phhValue+8.6;
  float phVoltage = analogRead(phSensorPin);
  float phValue= phVoltage * (14.0 / 4095.0); // Scaling to pH range 0-14
  float tbdVoltage=analogRead(turbidityPin);
  float turbidityValue = 4095.0  * (5.0 / tbdVoltage); // Scaling to a 0-5 V range
  turbidityValue= turbidityValue * 20; //for 0-100 percantage

  volt = 0;
  for(int i=0; i<10; i++)
  {
      volt += ((float)analogRead(turbidityPin)/4095.0)*4.2;
      delay(10);
  }
  volt = volt/10;
  volt = round_to_dp(volt,2);
  if(volt < 2.5){
    ntu = 3000;
  }else{
    ntu = (-1120.4*(volt*volt))+(5742.3*volt)-4353.8; 
  }

  //add edge case solver
  if(ntu > 3000){
    ntu = 3000;
  }
  if(ntu < 0){
    ntu = 0;
  }
  if(myphestimate > 14){
    myphestimate = 14;
  }
  if(myphestimate < 0){
    myphestimate = 0;
  }





  sensors.requestTemperatures(); 
  float temperatureValue = sensors.getTempCByIndex(0) + 0.2; // + 0.2 adjustment after calibration

  // Serial.print ("ph Voltage: ");
  // Serial.print (analogRead(phVolt));
  // Serial.print (" ph nilai : ");
  // Serial.println (phhValue);

  Serial.print (" ph V: ");
  Serial.print (phVoltage);
  Serial.print (" ph: ");
  Serial.print (phValue);
  Serial.print (" ph V avg: ");
  Serial.print (phVolt);
  Serial.print (" phh: ");
  Serial.print (phhValue);
  Serial.print (" myphestimate: ");
  Serial.print (myphestimate);
  Serial.print (" phViaFunc: ");
  Serial.println (phviaFunc);

  Serial.print ("tbdy V: ");
  Serial.print (analogRead(turbidityPin));
  Serial.print (" tbdy: ");
  Serial.println (turbidityValue);

  Serial.print ("Tbdy2 V: ");
  Serial.print (volt);
  Serial.print (" Tbdy2: ");
  Serial.println (ntu);

  Serial.print(temperatureValue);
  Serial.println("ºC");

  if (temperatureValue<0){
    temperatureValue=0; //set 0 if temp sensor is not reading
  }
  displayText = "pH: " + String(phValue, 2) + " NTU: " + String(ntu, 1) + " SH: " + String(temperatureValue, 1)+" C ";
  // displayText = "pH: " + String(phValue, 2) + " NTU: " + String(turbidityValue, 1) + " SH: " + String(temperatureValue, 1)+" C ";
 
  // // random value //comment to disable random data
  // phValue=random(1,10);
  // turbidityValue=random(30,40);
  // temperatureValue=random(20,30);

  // unsigned long currentMillis = millis();
  // if (currentMillis - previousMillis >= interval) {
  //   previousMillis = currentMillis;

  //   lcd.clear();
  //   lcd.setCursor(0, 0);
  //   lcd.print(displayText.substring(scrollPos, scrollPos + 16));
  //   lcd.setCursor(0, 1);

  //   scrollPos++;
  //   if (scrollPos >= displayText.length()) {
  //     scrollPos = 0;
  //   }
  // }

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    lcd.clear(); // Clear the LCD

    // Calculate the text to display
    String visibleText = displayText.substring(scrollPos, scrollPos + 16);

    // Handle looping by appending the beginning of the text
    if (scrollPos + 16 > displayText.length()) {
        int overflow = scrollPos + 16 - displayText.length();
        visibleText += displayText.substring(0, overflow);
    }

    // Display the text
    lcd.setCursor(0, 0);
    lcd.print(visibleText);

    // Increment scroll position
    scrollPos++;
    if (scrollPos >= displayText.length()) {
        scrollPos = 0; // Reset scroll position when reaching the end
    }
  }

  // Send new readings to database
  if (Firebase.ready() && (millis() - sendDataPrevMillis > timerDelay || sendDataPrevMillis == 0)){
     
    sendDataPrevMillis = millis();

    //Get current timestamp
    timestamp = getTime();

    parentPath= databasePath + "/" + String(timestamp);

    json.set(tempPath.c_str(), String(temperatureValue));
    json.set(turbPath.c_str(), String(ntu));  //turbidityValue
    json.set(phPath.c_str(), String(myphestimate)); //phValue
    json.set(timePath, String(timestamp));
    Serial.print ("time: ");
    Serial.println (timestamp);
    Serial.printf("Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
  }
}
