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

public class InvalidLoginTest {

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
    public void testInvalidCredentials() throws Exception {
        loginPage.doLogin(ConfigReader.getProperty("invalid.username"), ConfigReader.getProperty("invalid.password"));
        
        String actualErrorMsg = loginPage.getErrorMessage();
        String expectedErrorMsg = "Warning: No match for E-Mail Address and/or Password.";
        
        Assert.assertTrue(actualErrorMsg.contains(expectedErrorMsg), "The displayed error message does not match the expected validation text.");
    }

    @AfterMethod
    public void tearDown() {
        DriverFactory.quitDriver();
    }
}
