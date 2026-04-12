package tests;

import org.openqa.selenium.WebDriver;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Optional;
import org.testng.annotations.Parameters;
import org.testng.annotations.Test;
import factory.DriverFactory;
import pages.OpenCartLoginPage;
import utils.ConfigReader;

public class ValidLoginTest {

    private WebDriver driver;
    private OpenCartLoginPage loginPage;

    @Parameters({"browser"})
    @BeforeMethod
    public void setUp(@Optional("chrome") String browser) {
        driver = DriverFactory.getDriver(browser);
        driver.get(ConfigReader.getProperty("url"));
        loginPage = new OpenCartLoginPage(driver);
    }

    @Test
    public void testValidCredentials() throws Exception {
        loginPage.doLogin(ConfigReader.getProperty("valid.username"), ConfigReader.getProperty("valid.password"));
        
        String currentUrl = driver.getCurrentUrl();
        Assert.assertFalse(currentUrl.contains("route=account/login"), "Login failed. You are still on the login page.");
    }

    @AfterMethod
    public void tearDown() {
        DriverFactory.quitDriver();
    }
}
