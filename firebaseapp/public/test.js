switch(true) {
    case (temperature < 10):
        tenmText = 'Dingin Sekali';
        break;
    case (temperature >= 10 && temperature < 20):
        tenmText = 'Dingin';
        break;
    case (temperature >= 20 && temperature < 25):
        tenmText = 'Cukup Dingin';
        break;
    case (temperature >= 25 && temperature < 30):
        tenmText = 'Normal';
        break;
    case (temperature >= 30 && temperature < 35):
        tenmText = 'Cukup Panas';
        break;
    case (temperature >= 35 ):
        tenmText = 'Panas';
        break;
    default:
        tenmText = 'Invalid Data';
  }