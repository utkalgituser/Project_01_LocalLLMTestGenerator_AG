package pages;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class OpenCartLoginPage {

    private WebDriverWait wait;

    @FindBy(xpath = "//input[@id='input-email']")
    private WebElement emailInput;

    @FindBy(xpath = "//input[@id='input-password']")
    private WebElement passwordInput;

    @FindBy(xpath = "//input[@value='Login']")
    private WebElement loginButton;

    @FindBy(xpath = "//div[contains(@class, 'alert-danger')]")
    private WebElement errorMessage;

    public OpenCartLoginPage(WebDriver driver) {
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        PageFactory.initElements(driver, this);
    }

    public void enterEmail(String email) throws Exception {
        try {
            wait.until(ExpectedConditions.visibilityOf(emailInput)).clear();
            emailInput.sendKeys(email);
        } catch (Exception e) {
            throw new Exception("Exception occurred while entering email: " + e.getMessage());
        }
    }

    public void enterPassword(String password) throws Exception {
        try {
            wait.until(ExpectedConditions.visibilityOf(passwordInput)).clear();
            passwordInput.sendKeys(password);
        } catch (Exception e) {
            throw new Exception("Exception occurred while entering password: " + e.getMessage());
        }
    }

    public void clickLoginButton() throws Exception {
        try {
            wait.until(ExpectedConditions.elementToBeClickable(loginButton)).click();
        } catch (Exception e) {
            throw new Exception("Exception occurred while clicking login button: " + e.getMessage());
        }
    }

    public String getErrorMessage() throws Exception {
        try {
            return wait.until(ExpectedConditions.visibilityOf(errorMessage)).getText();
        } catch (Exception e) {
            throw new Exception("Exception occurred while fetching error message: " + e.getMessage());
        }
    }

    public void doLogin(String email, String password) throws Exception {
        enterEmail(email);
        enterPassword(password);
        clickLoginButton();
    }
}
