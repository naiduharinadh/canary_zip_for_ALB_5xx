const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION });
const cloudwatch = new AWS.CloudWatch();

const alb_check = async function () {
    // Set the time range for the last 5 minutes
    const endTime = new Date();
    const startTime = new Date(endTime - 5 * 60 * 1000);

    const params = {
        MetricName: 'HTTPCode_Target_5XX_Count',
        Namespace: 'AWS/ApplicationELB',
        Period: 300, // 5 minutes
        StartTime: startTime,
        EndTime: endTime,
        Statistics: ['Sum'],
        Dimensions: [
            {
                Name: 'LoadBalancer',
                Value: process.env.ALB_NAME
            }
        ]
    };

    try {
        const data = await cloudwatch.getMetricStatistics(params).promise();
        
        // Check if there are any 5xx errors
        const errorCount = data.Datapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0);

        if (errorCount > 0) {
            throw new Error(`ALB returned ${errorCount} 5xx errors in the last 5 minutes`);
        } else {
            log.info('No 5xx errors detected in ALB');
        }

        // Optionally, you can include a direct HTTP check
        const url = process.env.ALB_URL;
        const page = await synthetics.getPage();
        const response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});

        if (response.status() !== 200) {
            throw new Error(`Failed to load page. Status Code: ${response.status()}`);
        }

        log.info('ALB health check passed');
    } catch (error) {
        throw error;
    }
};

exports.handler = async () => {
    return await synthetics.executeStep('ALB Health Check', () => {
        return alb_check();
    });
};
