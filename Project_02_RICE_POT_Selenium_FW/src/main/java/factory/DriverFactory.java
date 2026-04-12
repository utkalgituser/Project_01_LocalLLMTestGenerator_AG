package factory;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import java.time.Duration;

public class DriverFactory {

    private static ThreadLocal<WebDriver> driverProvider = new ThreadLocal<>();

    public static WebDriver getDriver(String browser) {
        if (driverProvider.get() == null) {
            WebDriver driver;
            
            if (browser == null || browser.trim().isEmpty()) {
                browser = "chrome";
            }
            
            switch (browser.toLowerCase()) {
                case "firefox":
                    driver = new FirefoxDriver();
                    break;
                case "edge":
                    driver = new EdgeDriver();
                    break;
                case "chrome":
                default:
                    driver = new ChromeDriver();
                    break;
            }
            driver.manage().window().maximize();
            driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(60));
            driverProvider.set(driver);
        }
        return driverProvider.get();
    }

    public static void quitDriver() {
        if (driverProvider.get() != null) {
            driverProvider.get().quit();
            driverProvider.remove();
        }
    }
}
